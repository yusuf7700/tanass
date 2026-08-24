// TODO: Firebase loyihangiz sozlamalarini shu yerga qo'ying.
// Firebase Console -> Project settings -> General -> Your apps -> SDK setup.
//
// Buni to'ldirgach, index.html/read.html/admin.html ichiga quyidagi
// skriptlarni ulash kerak bo'ladi:
//   <script type="module" src="js/firebase-init.js"></script>
// (firebase-init.js'ni keyingi bosqichda birga tayyorlaymiz)

const firebaseConfig = {
  apiKey: "TODO",
  authDomain: "TODO.firebaseapp.com",
  projectId: "TODO",
  storageBucket: "TODO.appspot.com",
  messagingSenderId: "TODO",
  appId: "TODO"
};

// Hozircha Firebase ulanmagan — admin.js shu holatni aniqlab,
// "demo rejim"da (faqat konsolga/JSON ko'rinishda) ishlaydi.
window.__FIREBASE_READY__ = false;
