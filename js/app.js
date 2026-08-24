(function () {
  const listEl = document.getElementById('textList');
  const chipsEl = document.getElementById('levelChips');

  let activeLevel = 'Barchasi';
  let texts = [];

  function levelsFrom(arr) {
    const set = new Set(arr.map((t) => t.level));
    return ['Barchasi', ...Array.from(set)];
  }

  function renderChips() {
    chipsEl.innerHTML = '';
    levelsFrom(texts).forEach((level) => {
      const chip = document.createElement('button');
      chip.className = 'chip' + (level === activeLevel ? ' active' : '');
      chip.textContent = level;
      chip.addEventListener('click', () => {
        activeLevel = level;
        render();
      });
      chipsEl.appendChild(chip);
    });
  }

  function render() {
    renderChips();
    const filtered = activeLevel === 'Barchasi'
      ? texts
      : texts.filter((t) => t.level === activeLevel);

    listEl.innerHTML = '';

    if (filtered.length === 0) {
      listEl.innerHTML = '<div class="empty-state">Bu darajada hali matn yo\'q</div>';
      return;
    }

    filtered.forEach((t) => {
      const card = document.createElement('a');
      card.href = `read.html?id=${encodeURIComponent(t.id)}`;
      card.className = 'text-card';

      const pct = Math.max(t.progress || 0, getProgress(t.id));
      const ringClass = pct >= 100 ? 'progress-ring done' : 'progress-ring';

      card.innerHTML = `
        <div class="${ringClass}" style="--pct:${pct}"></div>
        <div class="meta">
          <h3>${t.title}</h3>
          <p>${splitIntoWords(t.text).length} so'z &middot; ${pct}% tugallangan</p>
        </div>
        <span class="level-badge">${t.level}</span>
      `;
      listEl.appendChild(card);
    });
  }

  async function loadTexts() {
    if (window.__FIREBASE_READY__) {
      try {
        const snap = await db.collection('texts').orderBy('createdAt', 'desc').get();
        if (!snap.empty) {
          texts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          render();
          return;
        }
      } catch (e) {
        console.error('Firestore xato, namuna ma\'lumotga o\'tildi:', e);
      }
    }
    // Firestore bo'sh yoki ulanmagan bo'lsa — namuna matnlar bilan ko'rsatamiz.
    texts = SAMPLE_TEXTS;
    render();
  }

  loadTexts();
})();
