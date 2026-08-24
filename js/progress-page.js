(function () {
  const summaryEl = document.getElementById('progressSummary');
  const listEl = document.getElementById('progressList');

  async function loadTexts() {
    if (window.__FIREBASE_READY__) {
      try {
        const snap = await db.collection('texts').orderBy('createdAt', 'desc').get();
        if (!snap.empty) return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } catch (e) {
        console.error('Firestore xato, namuna ma\'lumotga o\'tildi:', e);
      }
    }
    return SAMPLE_TEXTS;
  }

  function render(texts) {
    const withProgress = texts.map((t) => ({
      ...t,
      pct: Math.max(t.progress || 0, getProgress(t.id))
    }));

    const started = withProgress.filter((t) => t.pct > 0).length;
    const done = withProgress.filter((t) => t.pct >= 100).length;
    const avg = withProgress.length
      ? Math.round(withProgress.reduce((s, t) => s + t.pct, 0) / withProgress.length)
      : 0;

    summaryEl.innerHTML = `
      <div class="stat-card"><div class="stat-num">${done}</div><div class="stat-label">Tugallangan</div></div>
      <div class="stat-card"><div class="stat-num">${started}</div><div class="stat-label">Boshlangan</div></div>
      <div class="stat-card"><div class="stat-num">${avg}%</div><div class="stat-label">O'rtacha</div></div>
    `;

    if (withProgress.length === 0) {
      listEl.innerHTML = '<div class="empty-state">Hali matn yo\'q</div>';
      return;
    }

    withProgress.sort((a, b) => b.pct - a.pct);

    listEl.innerHTML = withProgress.map((t) => `
      <a href="read.html?id=${encodeURIComponent(t.id)}" class="text-card">
        <div class="${t.pct >= 100 ? 'progress-ring done' : 'progress-ring'}" style="--pct:${t.pct}"></div>
        <div class="meta">
          <h3>${t.title}</h3>
          <p>${t.pct}% yodlangan</p>
        </div>
        <span class="level-badge">${t.level}</span>
      </a>
    `).join('');
  }

  loadTexts().then(render);
})();
