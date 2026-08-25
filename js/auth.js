// Tanass — Google orqali kirish (Firebase Auth).
// Maqsad: boshqa qurilmadan kirganda ham progress bir xil ko'rinishi.
window.authReady = (async () => {
  // firebase-auth modulini firebase-config bilan BIR VAQTDA yuklashni
  // boshlaymiz (ketma-ket emas) — ikkalasi ham tarmoqdan parallel keladi.
  const authImportPromise = import("https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js");
  const fbs = await window.firebaseReady;
  if (!fbs) return null;
  try {
    const {
      getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
      getRedirectResult, onAuthStateChanged, signOut
    } = await authImportPromise;

    const auth = getAuth(fbs.app);
    const provider = new GoogleAuthProvider();
    return { auth, provider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut, fbs };
  } catch (e) {
    console.error('Auth ulanmadi:', e);
    return null;
  }
})();
