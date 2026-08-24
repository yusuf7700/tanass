(function () {
  const listEl = document.getElementById('textList');
  const chipsEl = document.getElementById('levelChips');

  let activeLevel = 'Barchasi';

  function levelsFrom(texts) {
    const set = new Set(texts.map((t) => t.level));
    return ['Barchasi', ...Array.from(set)];
  }

  function renderChips(texts) {
    chipsEl.innerHTML = '';
    levelsFrom(texts).forEach((level) => {
      const chip = document.createElement('button');
      chip.className = 'chip' + (level === activeLevel ? ' active' : '');
      chip.textContent = level;
      chip.addEventListener('click', () => {
        activeLevel = level;
        render(texts);
      });
      chipsEl.appendChild(chip);
    });
  }

  function render(texts) {
    renderChips(texts);
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

      const pct = t.progress || 0;
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

  // Hozircha namuna ma'lumot bilan. Firebase ulanganda
  // shu joyga Firestore so'rovi qo'yiladi.
  render(SAMPLE_TEXTS);
})();
