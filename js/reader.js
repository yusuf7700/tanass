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
      pendingIndex = null;
      clearTimeout(pendingTimer);
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

  function revealWord(i) {
    const span = textEl.querySelector(`.word[data-i="${i}"]`);
    if (span) {
      span.classList.remove('hidden');
      span.classList.add('revealed');
    }
    revealedCount++;
    if (window.setProgress && item.id) {
      setProgress(item.id, Math.round((revealedCount / expectedWords.length) * 100));
    }
  }
  let revealedCount = 0;

  // ---------- xato signal (bir soniyalik "wrong" tovushi + so'zni qizil ko'rsatish) ----------
  let audioCtx;
  function beepWrong() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.value = 220;
      g.gain.value = 0.16;
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      o.stop(audioCtx.currentTime + 0.3);
    } catch (e) { /* audio context mavjud emas */ }
  }

  function flashWrong() {
    if (pointer >= expectedWords.length) return;
    beepWrong();
    const span = textEl.querySelector(`.word[data-i="${pointer}"]`);
    if (span) {
      span.classList.remove('hidden');
      span.classList.add('wrong');
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

  // To'liq bir xil bo'lmasa ham, yaqin talaffuz/tanish xatosi bo'lsa qabul qilinadi
  // (lekin oldingidan biroz qattiqroq — tasodifiy noto'g'ri so'zlar o'tib ketmasin uchun).
  function isSimilar(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    if (a.length >= 3 && b.length >= 3 && (a.includes(b) || b.includes(a))) return true;
    const dist = levenshtein(a, b);
    const maxLen = Math.max(a.length, b.length);
    return dist / maxLen <= 0.25; // ~75%+ moslik
  }

  // ---------- tasdiqlash bilan ochish ----------
  // So'z darhol ochilmaydi: keyingi so'z aytilganda (tasdiqlangach) yoki
  // ~3 soniya jim turilsa avtomatik ochiladi. Shu bilan tasodifiy/chala
  // tanilgan so'zlar darhol ekranga chiqib ketmaydi.
  const CONFIRM_DELAY_MS = 3000;
  let pendingIndex = null;
  let pendingTimer = null;

  function commitPending() {
    if (pendingIndex === null) return;
    clearTimeout(pendingTimer);
    revealWord(pendingIndex);
    pendingIndex = null;
    if (pointer >= expectedWords.length) {
      stopListening();
      statusEl.textContent = 'Tabriklaymiz, tugatdingiz! 🎉';
    }
  }

  function matchWord(i) {
    if (pendingIndex !== null) commitPending(); // keyingi so'z tasdiqladi
    pendingIndex = i;
    clearTimeout(pendingTimer);
    pendingTimer = setTimeout(commitPending, CONFIRM_DELAY_MS);
  }

  function tryAdvance(transcriptWords) {
    const startPointer = pointer;
    let ti = 0;
    let hadRealWord = false;
    while (ti < transcriptWords.length && pointer < expectedWords.length) {
      const w = normalize(transcriptWords[ti]);
      if (w.length >= 1) hadRealWord = true;
      if (w && isSimilar(w, normalize(expectedWords[pointer]))) {
        matchWord(pointer);
        pointer++;
      }
      ti++;
    }
    if (pointer === startPointer && hadRealWord) {
      flashWrong();
    }
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
    clearTimeout(pendingTimer);
    if (recognition) {
      try { recognition.stop(); } catch (e) { /* noop */ }
    }
  }

  micBtn.addEventListener('click', () => {
    if (listening) stopListening();
    else startListening();
  });
})();
