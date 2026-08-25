if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

let deferredPrompt;
const installRow = document.getElementById('installRow');
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installRow.style.display = 'flex';
});

installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installRow.style.display = 'none';
});

document.getElementById('clearCacheBtn').addEventListener('click', async () => {
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }
  location.reload(true);
});

// ---------- Google bilan kirish ----------
(async () => {
  const accountRow = document.getElementById('accountRow');
  const a = await window.authReady;
  if (!a) {
    accountRow.innerHTML = '<div>Hisob<span class="sub">Ulanishda xatolik, keyinroq urinib ko\'ring</span></div>';
    return;
  }

  a.onAuthStateChanged(a.auth, (user) => {
    if (user) {
      accountRow.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
          ${user.photoURL ? `<img src="${user.photoURL}" style="width:36px;height:36px;border-radius:50%;">` : ''}
          <div>${user.displayName || user.email}<span class="sub">Progress barcha qurilmalarda sinxron</span></div>
        </div>
        <button id="signOutBtn">Chiqish</button>
      `;
      document.getElementById('signOutBtn').addEventListener('click', () => a.signOut(a.auth));
    } else {
      accountRow.innerHTML = `
        <div>Hisobga kirmagansiz<span class="sub">Progressni boshqa qurilmalarda ham ko'rish uchun kiring</span></div>
        <button id="signInBtn">Google</button>
      `;
      document.getElementById('signInBtn').addEventListener('click', async () => {
        try {
          await a.signInWithPopup(a.auth, a.provider);
        } catch (e) {
          console.error(e);
          if (e.code !== 'auth/popup-closed-by-user') alert("Kirishda xatolik: " + e.message);
        }
      });
    }
  });

  await syncProgressWithCloud();
})();
