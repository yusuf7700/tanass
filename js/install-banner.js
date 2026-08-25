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
      padding: 12px 14px; display: flex; align-items: center; gap: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.25); z-index: 100; font-size: 13px;
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

  if (isIOS) {
    showBanner(`
      <span style="font-size:20px;">📲</span>
      <span style="flex:1;">Ilova sifatida o'rnatish: pastdagi <b>Ulashish</b> tugmasi → <b>"Bosh ekranga qo'shish"</b></span>
      <button id="installBannerClose" style="color:var(--bg);opacity:0.7;font-size:18px;line-height:1;">✕</button>
    `);
    return;
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    showBanner(`
      <span style="font-size:20px;">📲</span>
      <span style="flex:1;">Tanass'ni ilova sifatida o'rnating — tezroq ochiladi</span>
      <button id="installBannerBtn" style="background:var(--accent);color:var(--accent-ink);font-weight:700;padding:7px 14px;border-radius:999px;">O'rnatish</button>
      <button id="installBannerClose" style="color:var(--bg);opacity:0.7;font-size:18px;line-height:1;">✕</button>
    `, async () => {
      e.prompt();
      await e.userChoice;
      document.getElementById('installBanner')?.remove();
    });
  });
})();
