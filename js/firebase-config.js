// Tanass — Firebase ulanishi (Firestore, yengil "modular" SDK).
// Dynamic import orqali — bu compat versiyaga qaraganda sezilarli
// kichikroq va tezroq yuklanadi.
window.firebaseReady = (async () => {
  try {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js");
    const {
      initializeFirestore, collection, query, orderBy, getDocs,
      doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, serverTimestamp
    } = await import("https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js");

    const firebaseConfig = {
      apiKey: "AIzaSyDnvWsFODANLMYz_12pgmJAZYokswCWWjw",
      authDomain: "tanass.firebaseapp.com",
      projectId: "tanass",
      storageBucket: "tanass.firebasestorage.app",
      messagingSenderId: "672855852722",
      appId: "1:672855852722:web:9359185cd3d2188b7eabab"
    };

    const app = initializeApp(firebaseConfig);
    // O'zbekiston tarmog'ida standart WebChannel ulanishi sekin/tiqilib
    // qolishi mumkin — long-polling'ga avtomatik o'tish buni tezlashtiradi
    // (Taomchi loyihasida ham shu sozlama ishlatilgan).
    const db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });

    window.__FIREBASE_READY__ = true;
    return { app, db, collection, query, orderBy, getDocs, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, serverTimestamp };
  } catch (e) {
    console.error('Firebase ulanmadi:', e);
    window.__FIREBASE_READY__ = false;
    return null;
  }
})();
