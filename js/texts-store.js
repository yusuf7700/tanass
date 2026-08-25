// Matnlar ro'yxatini BIR MARTA Firestore'dan oladi va keshlaydi.
// Bir nechta view (Matnlar, Progress) shu keshdan foydalanadi —
// har safar view almashganda qayta so'rov yubormaslik uchun.
window.TanassTexts = (function () {
  let cache = null;
  let inFlight = null;

  async function fetchTexts() {
    // Bulut bilan progress sinxronlash matnlarni yuklash bilan BIR VAQTDA
    // ishga tushiriladi (kutib turilmaydi) — shunda ro'yxat auth tugashini
    // kutmasdan tezroq chiqadi.
    const syncPromise = window.syncProgressWithCloud
      ? syncProgressWithCloud().catch(() => {})
      : Promise.resolve();

    const fbs = await window.firebaseReady;
    let result = null;

    if (fbs) {
      try {
        const q = fbs.query(fbs.collection(fbs.db, 'texts'), fbs.orderBy('createdAt', 'desc'));
        const snap = await fbs.getDocs(q);
        if (!snap.empty) {
          result = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        }
      } catch (e) {
        console.error('Firestore xato, namuna ma\'lumotga o\'tildi:', e);
      }
    }

    if (!result) result = SAMPLE_TEXTS;

    await syncPromise; // progress qiymatlari birlashtirilganiga ishonch hosil qilamiz
    return result;
  }

  function getTexts() {
    if (cache) return Promise.resolve(cache);
    if (!inFlight) {
      inFlight = fetchTexts().then((texts) => {
        cache = texts;
        inFlight = null;
        return texts;
      });
    }
    return inFlight;
  }

  function invalidate() {
    cache = null;
  }

  return { getTexts, invalidate };
})();
