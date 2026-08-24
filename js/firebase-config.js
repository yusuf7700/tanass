// Tanass — Firebase ulanishi (Firestore).
// Audio fayllar hozircha GitHub repo ichidan (audio/ papka) beriladi,
// shuning uchun Storage shart emas — billing kerak bo'lmaydi.
const firebaseConfig = {
  apiKey: "AIzaSyDnvWsFODANLMYz_12pgmJAZYokswCWWjw",
  authDomain: "tanass.firebaseapp.com",
  projectId: "tanass",
  storageBucket: "tanass.firebasestorage.app",
  messagingSenderId: "672855852722",
  appId: "1:672855852722:web:9359185cd3d2188b7eabab"
};

firebase.initializeApp(firebaseConfig);
window.db = firebase.firestore();
window.__FIREBASE_READY__ = true;
