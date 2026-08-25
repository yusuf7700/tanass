// Tanass — Google orqali kirish (Firebase Auth).
// Maqsad: boshqa qurilmadan kirganda ham progress bir xil ko'rinishi.
window.authReady = (async () => {
  const fbs = await window.firebaseReady;
  if (!fbs) return null;
  try {
    const {
      getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
      getRedirectResult, onAuthStateChanged, signOut
    } = await import("https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js");

    const auth = getAuth(fbs.app);
    const provider = new GoogleAuthProvider();
    return { auth, provider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut, fbs };
  } catch (e) {
    console.error('Auth ulanmadi:', e);
    return null;
  }
})();
