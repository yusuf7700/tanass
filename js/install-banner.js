// Do'stlarga havola yuborilganda, sahifa ochilishi bilan darhol
// "O'rnatish" banneri ko'rinishi uchun (Sozlamalargacha borish shart emas).
(function () {
  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
    return; // allaqachon ilova sifatida ochilgan
  }
  if (sessionStorage.getItem('tanass_install_dismissed') === '1') return;

  const isIOS = /iP(hone|od|ad)/.test(navigator.userAgent);

  function showBanner(html, onInstallClick) {
    const bar = document.createElement('div');
    bar.id = 'installBanner';
    bar.style.cssText = `
      position: fixed; left: 12px; right: 12px; top: calc(env(safe-area-inset-top, 0px) + 10px);
      background: var(--ink); color: var(--bg); border-radius: 16px;
      padding: 14px; box-shadow: 0 8px 24px rgba(0,0,0,0.25); z-index: 100; font-size: 13px;
    `;
    bar.innerHTML = html;
    document.body.appendChild(bar);

    const closeBtn = bar.querySelector('#installBannerClose');
    closeBtn.addEventListener('click', () => {
      bar.remove();
      sessionStorage.setItem('tanass_install_dismissed', '1');
    });

    const installBtn = bar.querySelector('#installBannerBtn');
    if (installBtn && onInstallClick) {
      installBtn.addEventListener('click', onInstallClick);
    }
  }

  const shareIconSVG = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex:none;"><path d="M12 3v12"/><path d="M7 8l5-5 5 5"/><rect x="4" y="12" width="16" height="9" rx="2"/></svg>`;

  if (isIOS) {
    showBanner(`
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
        <span style="font-size:20px;">📲</span>
        <b style="flex:1;">Ilova sifatida o'rnatish</b>
        <button id="installBannerClose" style="color:var(--bg);opacity:0.7;font-size:18px;line-height:1;">✕</button>
      </div>
      <div style="display:flex;align-items:center;gap:8px;padding:6px 0;">
        <span style="background:var(--bg);color:var(--ink);width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:800;flex:none;">1</span>
        <span>Pastki panelda ${shareIconSVG} <b>Ulashish</b> belgisini bosing</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;padding:6px 0;">
        <span style="background:var(--bg);color:var(--ink);width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:800;flex:none;">2</span>
        <span>Ro'yxatni pastga surib, <b>"Bosh ekranga qo'shish"</b>ni toping</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;padding:6px 0;">
        <span style="background:var(--bg);color:var(--ink);width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:800;flex:none;">3</span>
        <span>Yuqori o'ng burchakda <b>"Qo'shish"</b>ni bosing</span>
      </div>
    `);
    return;
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    showBanner(`
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:20px;">📲</span>
        <span style="flex:1;">Tanass'ni ilova sifatida o'rnating — tezroq ochiladi</span>
        <button id="installBannerBtn" style="background:var(--accent);color:var(--accent-ink);font-weight:700;padding:7px 14px;border-radius:999px;white-space:nowrap;">O'rnatish</button>
        <button id="installBannerClose" style="color:var(--bg);opacity:0.7;font-size:18px;line-height:1;">✕</button>
      </div>
    `, async () => {
      e.prompt();
      await e.userChoice;
      document.getElementById('installBanner')?.remove();
    });
  });
})();
