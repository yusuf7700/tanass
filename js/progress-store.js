// Har bir matn bo'yicha eng yaxshi natijani (%) shu qurilmada saqlaydi,
// va agar foydalanuvchi Google bilan kirgan bo'lsa — Firestore'ga ham
// yozadi, shunda boshqa qurilmadan kirganda ham progress ko'rinadi.
const PROGRESS_KEY = 'tanass_progress_v1';

function getAllProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); }
  catch (e) { return {}; }
}

function getProgress(id) {
  return getAllProgress()[id] || 0;
}

function setProgress(id, pct) {
  const all = getAllProgress();
  const prev = all[id] || 0;
  if (pct > prev) {
    all[id] = pct;
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
    queueCloudProgressSync();
  }
}

// Kirgan foydalanuvchi uchun: lokal va buluttagi progressni birlashtiradi
// (har biridan eng kattasini oladi), so'ng ikkalasini ham yangilaydi.
async function syncProgressWithCloud() {
  const a = await window.authReady;
  if (!a) return null;
  return new Promise((resolve) => {
    a.onAuthStateChanged(a.auth, async (user) => {
      if (!user) { resolve(null); return; }
      try {
        const ref = a.fbs.doc(a.fbs.db, 'users', user.uid);
        const snap = await a.fbs.getDoc(ref);
        const remote = snap.exists() ? (snap.data().progress || {}) : {};
        const local = getAllProgress();
        const merged = { ...remote };
        Object.keys(local).forEach((k) => {
          merged[k] = Math.max(merged[k] || 0, local[k]);
        });
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(merged));
        await a.fbs.setDoc(ref, {
          progress: merged,
          email: user.email || null,
          name: user.displayName || null,
          updatedAt: a.fbs.serverTimestamp()
        }, { merge: true });
      } catch (e) {
        console.error('Progress sinxronlashda xato:', e);
      }
      resolve(user);
    });
  });
}

let cloudSyncTimer = null;
function queueCloudProgressSync() {
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(async () => {
    const a = await window.authReady;
    if (!a || !a.auth.currentUser) return;
    try {
      const ref = a.fbs.doc(a.fbs.db, 'users', a.auth.currentUser.uid);
      await a.fbs.setDoc(ref, { progress: getAllProgress() }, { merge: true });
    } catch (e) {
      console.error('Progress yuklashda xato:', e);
    }
  }, 2500);
}
