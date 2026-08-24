(function () {
  // Vaqtinchalik oddiy parol tekshiruvi.
  // MUHIM: bu faqat boshlang'ich himoya. Keyinroq Firebase Auth
  // (admin UID tekshiruvi) bilan almashtirish kerak.
  const ADMIN_PASS = 'tanass2026';

  const loginBox = document.getElementById('loginBox');
  const textForm = document.getElementById('textForm');

  document.getElementById('loginBtn').addEventListener('click', () => {
    const val = document.getElementById('adminPass').value;
    if (val === ADMIN_PASS) {
      loginBox.style.display = 'none';
      textForm.style.display = 'block';
      sessionStorage.setItem('tanass_admin_ok', '1');
    } else {
      alert("Parol noto'g'ri");
    }
  });

  if (sessionStorage.getItem('tanass_admin_ok') === '1') {
    loginBox.style.display = 'none';
    textForm.style.display = 'block';
  }

  textForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = textForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saqlanmoqda...';

    const title = document.getElementById('fTitle').value.trim();
    const level = document.getElementById('fLevel').value;
    const text = document.getElementById('fText').value.trim();
    const audioUrl = document.getElementById('fAudio').value.trim();

    const record = {
      title,
      level,
      text,
      audioUrl,
      progress: 0,
      createdAt: window.__FIREBASE_READY__
        ? firebase.firestore.FieldValue.serverTimestamp()
        : new Date().toISOString()
    };

    try {
      if (window.__FIREBASE_READY__) {
        await db.collection('texts').add(record);
      } else {
        const saved = JSON.parse(localStorage.getItem('tanass_draft_texts') || '[]');
        saved.push(record);
        localStorage.setItem('tanass_draft_texts', JSON.stringify(saved));
      }
      document.getElementById('resultJson').textContent =
        `"${title}" saqlandi. Bosh sahifada darhol ko'rinadi.`;
      document.getElementById('resultBox').style.display = 'block';
      textForm.reset();
    } catch (err) {
      console.error(err);
      alert("Xatolik: " + err.message + "\n\nFirestore qoidalarini (rules) tekshiring.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Saqlash';
    }
  });
})();
