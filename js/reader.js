(async function () {
  const params = new URLSearchParams(location.search);
  const textId = params.get('id');
  const item = await loadItem(textId);

  async function loadItem(id) {
    if (id && window.__FIREBASE_READY__) {
      try {
        const doc = await db.collection('texts').doc(id).get();
        if (doc.exists) return { id: doc.id, ...doc.data() };
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
  let pointer = 0;

  function renderWords() {
    textEl.innerHTML = expectedWords
      .map((w, i) => `<span class="word ${i < pointer ? 'revealed' : 'hidden'}" data-i="${i}">${w}</span>`)
      .join(' ');
  }
  renderWords();

  function revealWord(i) {
    const span = textEl.querySelector(`.word[data-i="${i}"]`);
    if (span) {
      span.classList.remove('hidden');
      span.classList.add('revealed');
    }
  }

  function resetReveal() {
    pointer = 0;
    renderWords();
  }

  // ---------- Arabic normalization for matching ----------
  function normalize(word) {
    return word
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '') // harakat / tashkeel
      .replace(/\u0640/g, '') // tatweel
      .replace(/[إأآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/[^\u0621-\u064A]/g, '') // strip punctuation etc.
      .trim();
  }

  function tryAdvance(transcriptWords) {
    let ti = 0;
    while (ti < transcriptWords.length && pointer < expectedWords.length) {
      if (normalize(transcriptWords[ti]) === normalize(expectedWords[pointer])) {
        revealWord(pointer);
        pointer++;
      }
      ti++;
    }
    if (pointer >= expectedWords.length) {
      stopListening();
      statusEl.textContent = "Tabriklaymiz, tugatdingiz! 🎉";
    }
  }

  // ---------- audio player ----------
  const audio = new Audio(item.audioUrl || '');
  const playBtn = document.getElementById('playBtn');
  const speedSelect = document.getElementById('speedSelect');
  const scrubFill = document.getElementById('scrubFill');
  const scrub = document.getElementById('scrub');
  const rewindBtn = document.getElementById('rewindBtn');
  const hasAudio = !!item.audioUrl;

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

  speedSelect.addEventListener('change', () => {
    audio.playbackRate = parseFloat(speedSelect.value);
  });

  audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    scrubFill.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
  });
  audio.addEventListener('ended', () => {
    playBtn.innerHTML = playIcon();
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
  } else {
    recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA';
    recognition.continuous = true;
    recognition.interimResults = true;

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
        statusEl.textContent = "Mikrofonga ruxsat berilmadi";
        stopListening();
      }
    };

    recognition.onend = () => {
      // Ba'zi brauzerlar jim turgach avtomatik to'xtatadi — davom etamiz.
      if (listening) {
        try { recognition.start(); } catch (e) { /* already running */ }
      }
    };
  }

  function startListening() {
    if (!recognition || listening) return;
    if (pointer >= expectedWords.length) resetReveal();
    listening = true;
    micBtn.classList.add('listening');
    statusEl.textContent = 'Tinglayapman... yodingizdan ayting';
    try { recognition.start(); } catch (e) { /* already running */ }
  }

  function stopListening() {
    listening = false;
    micBtn.classList.remove('listening');
    statusEl.textContent = "Boshlash uchun mikrofonni bosing";
    if (recognition) {
      try { recognition.stop(); } catch (e) { /* noop */ }
    }
  }

  micBtn.addEventListener('click', () => {
    if (listening) stopListening();
    else startListening();
  });

  document.getElementById('resetBtn').addEventListener('click', () => {
    stopListening();
    resetReveal();
    statusEl.textContent = "Boshlash uchun mikrofonni bosing";
  });
})();
