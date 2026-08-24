// Har bir matn bo'yicha eng yaxshi natijani (%) shu qurilmada saqlaydi.
// Keyinchalik foydalanuvchi login qilganda buni Firestore'ga ko'chirish mumkin.
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
  }
}
