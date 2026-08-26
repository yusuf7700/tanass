(async function () {
  const params = new URLSearchParams(location.search);
  const textId = params.get('id');
  const item = await loadItem(textId);

  async function loadItem(id) {
    const fbs = await window.firebaseReady;
    if (id && fbs) {
      try {
        const ref = fbs.doc(fbs.db, 'texts', id);
        const snap = await fbs.getDoc(ref);
        if (snap.exists()) return { id: snap.id, ...snap.data() };
      } catch (e) {
        console.error('Firestore xato, namuna matnga o\'tildi:', e);
      }
    }
    return SAMPLE_TEXTS.find((t) => t.id === id) || SAMPLE_TEXTS[0];
  }

  document.getElementById('readerTitle').textContent = item.title;

  // ---------- text rendering ----------
  const expectedWords = splitIntoWords(item.text);
  const textEl = document.getElementById('arabicText');
  const visBtn = document.getElementById('visibilityBtn');
  const visLabel = document.getElementById('visibilityLabel');

  let pointer = 0;
  let mode = 'visible'; // 'visible' -> o'qish uchun ochiq, 'practice' -> yodlash uchun berkitilgan

  function renderWords() {
    textEl.innerHTML = expectedWords
      .map((w, i) => {
        let cls = 'word';
        if (mode === 'practice') cls += i < pointer ? ' revealed' : ' hidden';
        else cls += ' revealed';
        return `<span class="${cls}" data-i="${i}">${w}</span>`;
      })
      .join(' ');
  }
  renderWords();

  function setMode(next) {
    mode = next;
    if (mode === 'practice') {
      pointer = 0;
      revealedCount = 0;
      consecutiveMisses = 0;
    }
    renderWords();
    visLabel.textContent = mode === 'visible' ? 'Berkitish' : "Ko'rsatish";
  }

  visBtn.addEventListener('click', () => {
    setMode(mode === 'visible' ? 'practice' : 'visible');
    if (mode === 'visible') stopListening();
  });

  document.getElementById('restartBtn').addEventListener('click', () => {
    stopListening();
    setMode('practice');
    statusEl.textContent = 'Boshlash uchun mikrofonni bosing';
  });

  const soundBtn = document.getElementById('soundBtn');
  const soundIconOn = document.getElementById('soundIconOn');
  const soundIconOff = document.getElementById('soundIconOff');
  function refreshSoundIcon() {
    const off = localStorage.getItem('tanass_sound_off') === '1';
    soundIconOn.style.display = off ? 'none' : 'block';
    soundIconOff.style.display = off ? 'block' : 'none';
  }
  refreshSoundIcon();
  soundBtn.addEventListener('click', () => {
    const off = localStorage.getItem('tanass_sound_off') === '1';
    localStorage.setItem('tanass_sound_off', off ? '0' : '1');
    refreshSoundIcon();
  });

  function revealWord(i) {
    const span = textEl.querySelector(`.word[data-i="${i}"]`);
    if (span) {
      span.classList.remove('hidden');
      span.classList.add('revealed');
      span.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    revealedCount++;
    if (window.setProgress && item.id) {
      setProgress(item.id, Math.round((revealedCount / expectedWords.length) * 100));
    }
  }
  let revealedCount = 0;

  function markSkipped(i) {
    const span = textEl.querySelector(`.word[data-i="${i}"]`);
    if (span) {
      span.classList.remove('hidden');
      span.classList.add('skipped');
    }
    revealedCount++;
    if (window.setProgress && item.id) {
      setProgress(item.id, Math.round((revealedCount / expectedWords.length) * 100));
    }
  }

  // ---------- xato signal (ikki bosqichli pastlab boruvchi "xato" tovushi + so'zni qizil ko'rsatish) ----------
  let audioCtx;
  function ensureAudioCtx() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    }
    if (audioCtx.state === 'suspended') { audioCtx.resume().catch(() => {}); }
    return audioCtx;
  }

  function beepWrong() {
    if (localStorage.getItem('tanass_sound_off') === '1') return;
    const now = Date.now();
    if (now - lastBeepAt < 500) return; // ketma-ket juda tez-tez chalinib ketmasin
    lastBeepAt = now;
    const ctx = ensureAudioCtx();
    if (!ctx) return;
    try {
      const t = ctx.currentTime;
      const playTone = (freq, start, dur) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'square';
        o.frequency.value = freq;
        o.connect(g);
        g.connect(ctx.destination);
        g.gain.setValueAtTime(0.0001, t + start);
        g.gain.exponentialRampToValueAtTime(0.22, t + start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + start + dur);
        o.start(t + start);
        o.stop(t + start + dur + 0.02);
      };
      // Ikki pastlab boruvchi ton — aniq "xato" tovushi (bitta yumshoq sine emas)
      playTone(300, 0, 0.12);
      playTone(170, 0.13, 0.18);
    } catch (e) { /* audio context mavjud emas */ }
  }
  let lastBeepAt = 0;

  function flashWrong() {
    if (pointer >= expectedWords.length) return;
    beepWrong();
    const span = textEl.querySelector(`.word[data-i="${pointer}"]`);
    if (span) {
      span.classList.remove('hidden');
      span.classList.add('wrong');
      span.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        span.classList.remove('wrong');
        if (mode === 'practice') span.classList.add('hidden');
      }, 550);
    }
  }

  // ---------- Arabic normalization + moslik (fuzzy) ----------
  function normalize(word) {
    return word
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '') // harakat / tashkeel
      .replace(/\u0640/g, '') // tatweel
      .replace(/[إأآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/[^\u0621-\u064A]/g, '')
      .trim();
  }

  // ---------- Raqamlar: "besh", "yigirma bir" kabi sonlarni aytganda,
  // ovoz tanish tizimi ba'zida buni harflar bilan emas, "٥"/"21" kabi
  // raqam shaklida qaytaradi. normalize() bunday belgilarni o'chirib
  // tashlaganligi sabab, matndagi yozma arabcha son so'zi bilan hech
  // qachon mos kelmasdi. Shuning uchun raqam <-> yozma son so'zini
  // alohida solishtiramiz (0 dan 100 gacha).
  const AR_INDIC_DIGITS = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };
  function toWesternDigits(s) {
    return s.replace(/[٠-٩]/g, (d) => AR_INDIC_DIGITS[d]);
  }
  function rawToNumeral(raw) {
    const w = toWesternDigits(String(raw).trim());
    return /^[0-9]+$/.test(w) ? String(parseInt(w, 10)) : null;
  }
  // Kalitlar normalize()dan keyingi shaklda (ة->ه, hamzalar ا ga birlashtirilgan).
  const UNIT_WORD_TO_NUMERAL = {
    'صفر': '0',
    'واحد': '1', 'واحده': '1', 'احد': '1', 'احدي': '1',
    'اثنان': '2', 'اثنين': '2', 'ثنتان': '2', 'ثنتين': '2', 'اثنا': '2', 'اثني': '2', 'اثنتا': '2', 'اثنتي': '2',
    'ثلاثه': '3', 'ثلاث': '3',
    'اربعه': '4', 'اربع': '4',
    'خمسه': '5', 'خمس': '5',
    'سته': '6', 'ست': '6',
    'سبعه': '7', 'سبع': '7',
    'ثمانيه': '8', 'ثمان': '8',
    'تسعه': '9', 'تسع': '9',
    'عشره': '10', 'عشر': '10'
  };
  // Faqat "عشر"/"عشره" — teen sonlarda ikkinchi so'z sifatida ("+10" qo'shimchasi)
  const TEEN_SUFFIX = new Set(['عشر', 'عشره']);
  const TENS_WORD_TO_NUMERAL = {
    'عشرون': '20', 'عشرين': '20',
    'ثلاثون': '30', 'ثلاثين': '30',
    'اربعون': '40', 'اربعين': '40',
    'خمسون': '50', 'خمسين': '50',
    'ستون': '60', 'ستين': '60',
    'سبعون': '70', 'سبعين': '70',
    'ثمانون': '80', 'ثمانين': '80',
    'تسعون': '90', 'تسعين': '90'
  };
  const HUNDRED_WORDS = new Set(['مئه', 'مائه']);

  function wordToNumeral(normWord) {
    return UNIT_WORD_TO_NUMERAL[normWord] || TENS_WORD_TO_NUMERAL[normWord] || (HUNDRED_WORDS.has(normWord) ? '100' : null);
  }

  // rawWord — ovoz tanishdan kelgan xom so'z, normExpected — matndagi
  // kutilayotgan (bitta) so'zning normalize() qilingan shakli.
  function numeralsMatch(rawWord, normExpected) {
    const normRaw = normalize(rawWord);
    const numFromTranscript = rawToNumeral(rawWord) || wordToNumeral(normRaw);
    const numFromExpected = rawToNumeral(normExpected) || wordToNumeral(normExpected);
    return !!(numFromTranscript && numFromExpected && numFromTranscript === numFromExpected);
  }

  // Matndagi ketma-ket 1-2 so'zni bitta son sifatida o'qishga urinadi
  // (masalan "خمسة عشر" = 15, "واحد وعشرون" = 21). Topilsa
  // { numeral, consumed } qaytaradi, aks holda null.
  function expectedCompoundNumeral(idx) {
    if (idx >= expectedWords.length) return null;
    const w0 = normalize(expectedWords[idx]);
    const w1 = idx + 1 < expectedWords.length ? normalize(expectedWords[idx + 1]) : null;

    // Teen: unit + "عشر"/"عشره"  ->  10 + unit  (11-19)
    if (w1 && TEEN_SUFFIX.has(w1) && UNIT_WORD_TO_NUMERAL.hasOwnProperty(w0)) {
      const unit = parseInt(UNIT_WORD_TO_NUMERAL[w0], 10);
      if (unit >= 1 && unit <= 9) return { numeral: String(10 + unit), consumed: 2 };
    }

    // 21-99 (o'nlik bo'lmagan): unit + "و" + o'nlik so'zi bitta token
    // sifatida yozilgan (masalan "وعشرون")
    if (w1 && w1.charAt(0) === 'و' && UNIT_WORD_TO_NUMERAL.hasOwnProperty(w0)) {
      const tensPart = w1.slice(1);
      if (TENS_WORD_TO_NUMERAL.hasOwnProperty(tensPart)) {
        const unit = parseInt(UNIT_WORD_TO_NUMERAL[w0], 10);
        const tens = parseInt(TENS_WORD_TO_NUMERAL[tensPart], 10);
        if (unit >= 1 && unit <= 9) return { numeral: String(tens + unit), consumed: 2 };
      }
    }

    // Yolg'iz o'nlik (20, 30 ... 90)
    if (TENS_WORD_TO_NUMERAL.hasOwnProperty(w0)) {
      return { numeral: TENS_WORD_TO_NUMERAL[w0], consumed: 1 };
    }

    // Yolg'iz 100
    if (HUNDRED_WORDS.has(w0)) {
      return { numeral: '100', consumed: 1 };
    }

    // Yolg'iz birlik (0-10)
    if (UNIT_WORD_TO_NUMERAL.hasOwnProperty(w0)) {
      return { numeral: UNIT_WORD_TO_NUMERAL[w0], consumed: 1 };
    }

    return null;
  }

  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  }

  // To'liq bir xil bo'lmasa ham, yaqin talaffuz/tanish xatosi bo'lsa qabul qilinadi.
  function isSimilar(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    if (a.length >= 2 && b.length >= 2 && (a.includes(b) || b.includes(a))) return true;
    const dist = levenshtein(a, b);
    const maxLen = Math.max(a.length, b.length);
    return dist / maxLen <= 0.45;
  }

  // ---------- darhol ochish ----------
  // Moslik chegarasi endi yetarlicha ishonchli, shuning uchun so'z to'g'ri
  // aytilgach kutmasdan darhol ochiladi (avvalgi "keyingi so'zni kutish"
  // kechikishi olib tashlandi — u doim "1 so'z orqada" hissini berardi).
  function matchWord(i, count) {
    count = count || 1;
    for (let k = 0; k < count && i + k < expectedWords.length; k++) revealWord(i + k);
    if (i + count >= expectedWords.length) {
      stopListening();
      statusEl.textContent = 'Tabriklaymiz, tugatdingiz! 🎉';
    }
  }

  function tryAdvance(transcriptWords) {
    const startPointer = pointer;
    let ti = 0;
    let hadRealWord = false;
    while (ti < transcriptWords.length && pointer < expectedWords.length) {
      const rawWord = transcriptWords[ti];
      const w = normalize(rawWord);
      const expNorm = normalize(expectedWords[pointer]);
      const rawNumeral = rawToNumeral(rawWord);
      if (w.length >= 1 || rawNumeral) hadRealWord = true;

      // Agar ovoz tanish butun sonni raqam sifatida qaytargan bo'lsa
      // (masalan "21"), matndagi 1-2 so'zdan tashkil topgan yozma son
      // bilan solishtiramiz (masalan "واحد" + "وعشرون").
      if (rawNumeral) {
        const compound = expectedCompoundNumeral(pointer);
        if (compound && compound.numeral === rawNumeral) {
          matchWord(pointer, compound.consumed);
          pointer += compound.consumed;
          ti++;
          continue;
        }
      }

      if ((w && isSimilar(w, expNorm)) || numeralsMatch(rawWord, expNorm)) {
        matchWord(pointer);
        pointer++;
      }
      ti++;
    }
    if (pointer === startPointer && hadRealWord) {
      consecutiveMisses++;
      // Resync FAQAT eng boshida (hali birorta so'z tasdiqlanmagan bo'lsa)
      // ishlaydi — masalan matnning o'rtasidan boshlash uchun. Bir marta
      // birinchi so'z to'g'ri topilgach, davomida faqat ketma-ketlikda
      // ishlaydi — boshqa hech qachon sakramaydi.
      const canResync = pointer === 0 && revealedCount === 0;
      if (canResync && consecutiveMisses >= 3) {
        const resyncIndex = findResyncStart(transcriptWords);
        if (resyncIndex !== -1) {
          const gap = resyncIndex - pointer;
          for (let k = pointer; k < resyncIndex; k++) {
            if (gap <= 3) revealWord(k); else markSkipped(k);
          }
          pointer = resyncIndex;
          for (let n = 0; n < RESYNC_RUN && pointer < expectedWords.length; n++) {
            matchWord(pointer);
            pointer++;
          }
          if (gap > 3) statusEl.textContent = "🔄 Matn davomiga moslashtirildi, davom eting";
          const nextSpan = textEl.querySelector(`.word[data-i="${Math.min(pointer, expectedWords.length - 1)}"]`);
          if (nextSpan) nextSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
          consecutiveMisses = 0;
        } else {
          flashWrong();
        }
      } else {
        flashWrong();
      }
    } else {
      consecutiveMisses = 0;
    }
  }
  let consecutiveMisses = 0;

  // Agar bir necha marta ketma-ket mos kelmasa, matnning qolgan qismidan
  // ketma-ket 3 ta so'zlik ANIQ moslikni qidiradi ("o'rtadan boshlash" uchun).
  // 3 ta so'z talab qilish tasodifiy bitta so'z o'xshashligidan sakrab
  // ketishning oldini oladi.
  const RESYNC_RUN = 3;
  function findResyncStart(transcriptWords) {
    const valid = transcriptWords.filter((w) => normalize(w).length >= 1 || rawToNumeral(w));
    if (valid.length < RESYNC_RUN) return -1;
    for (let start = pointer + 1; start <= expectedWords.length - RESYNC_RUN; start++) {
      for (let ti = 0; ti <= valid.length - RESYNC_RUN; ti++) {
        let ok = true;
        for (let k = 0; k < RESYNC_RUN; k++) {
          const rawWord = valid[ti + k];
          const expNorm = normalize(expectedWords[start + k]);
          if (!(isSimilar(normalize(rawWord), expNorm) || numeralsMatch(rawWord, expNorm))) { ok = false; break; }
        }
        if (ok) return start;
      }
    }
    return -1;
  }

  // ---------- audio player ----------
  const audio = new Audio();
  audio.preload = 'none';
  const playBtn = document.getElementById('playBtn');
  const speedSelect = document.getElementById('speedSelect');
  const scrubFill = document.getElementById('scrubFill');
  const scrub = document.getElementById('scrub');
  const rewindBtn = document.getElementById('rewindBtn');
  const forwardBtn = document.getElementById('forwardBtn');
  const loopBtn = document.getElementById('loopBtn');
  const hasAudio = !!item.audioUrl;
  if (hasAudio) audio.src = item.audioUrl;

  if (!hasAudio) {
    playBtn.disabled = true;
    playBtn.style.opacity = 0.4;
    document.getElementById('player').title = "Bu matn uchun audio hali yuklanmagan";
  }

  playBtn.addEventListener('click', () => {
    if (!hasAudio) return;
    if (audio.paused) {
      audio.play();
      playBtn.innerHTML = pauseIcon();
    } else {
      audio.pause();
      playBtn.innerHTML = playIcon();
    }
  });

  rewindBtn.addEventListener('click', () => {
    if (!hasAudio) return;
    audio.currentTime = Math.max(0, audio.currentTime - 10);
  });
  forwardBtn.addEventListener('click', () => {
    if (!hasAudio) return;
    audio.currentTime = Math.min(audio.duration || Infinity, audio.currentTime + 10);
  });

  loopBtn.addEventListener('click', () => {
    audio.loop = !audio.loop;
    loopBtn.classList.toggle('active', audio.loop);
  });

  speedSelect.addEventListener('change', () => {
    audio.playbackRate = parseFloat(speedSelect.value);
  });

  audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    scrubFill.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
  });
  audio.addEventListener('ended', () => {
    if (!audio.loop) playBtn.innerHTML = playIcon();
  });
  scrub.addEventListener('click', (e) => {
    if (!hasAudio || !audio.duration) return;
    const rect = scrub.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * audio.duration;
  });

  function playIcon() {
    return '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
  }
  function pauseIcon() {
    return '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';
  }
  playBtn.innerHTML = playIcon();

  // ---------- speech recognition (mic reveal) ----------
  const micBtn = document.getElementById('micBtn');
  const statusEl = document.getElementById('micStatus');
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  let recognition = null;
  let listening = false;

  if (!SpeechRecognition) {
    statusEl.textContent = "Bu brauzerda ovoz tanish qo'llanmaydi (Chrome'dan foydalaning)";
    micBtn.disabled = true;
    micBtn.style.opacity = 0.4;
    document.getElementById('langSelect').style.display = 'none';
  } else {
    recognition = new SpeechRecognition();
    recognition.lang = localStorage.getItem('tanass_lang') || 'ar-SA';
    recognition.continuous = true;
    recognition.interimResults = true;

    const langSelect = document.getElementById('langSelect');
    langSelect.value = recognition.lang;
    langSelect.addEventListener('change', () => {
      recognition.lang = langSelect.value;
      localStorage.setItem('tanass_lang', langSelect.value);
      if (listening) { stopListening(); startListening(); }
    });

    recognition.onresult = (event) => {
      let finalChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalChunk += ' ' + event.results[i][0].transcript;
        }
      }
      if (finalChunk.trim()) {
        tryAdvance(splitIntoWords(finalChunk));
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        statusEl.textContent = 'Mikrofonga ruxsat berilmadi';
        stopListening();
      }
    };

    recognition.onend = () => {
      if (listening) {
        try { recognition.start(); } catch (e) { /* already running */ }
      }
    };
  }

  function startListening() {
    if (!recognition || listening) return;
    ensureAudioCtx(); // foydalanuvchi bosgan zahoti faollashtiramiz — keyinroq "wrong" ovozi jim qolib ketmasin
    if (!audio.paused) { audio.pause(); playBtn.innerHTML = playIcon(); } // ovoz mikrofonga xalaqit bermasin
    if (mode !== 'practice' || pointer >= expectedWords.length) setMode('practice');
    listening = true;
    micBtn.classList.add('listening');
    statusEl.textContent = 'Tinglayapman... yodingizdan ayting';
    try { recognition.start(); } catch (e) { /* already running */ }
  }

  function stopListening() {
    listening = false;
    micBtn.classList.remove('listening');
    statusEl.textContent = 'Boshlash uchun mikrofonni bosing';
    if (recognition) {
      try { recognition.stop(); } catch (e) { /* noop */ }
    }
  }

  micBtn.addEventListener('click', () => {
    if (listening) stopListening();
    else startListening();
  });
})();
