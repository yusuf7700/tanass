(function () {
  // Vaqtinchalik oddiy parol tekshiruvi.
  // MUHIM: bu faqat boshlang'ich himoya. Firebase ulangach buni
  // Firebase Auth (email/parol yoki Google, admin UID tekshiruvi
  // bilan) bilan almashtiramiz — hozirgi holat production uchun
  // yetarli emas, faqat linkni bilmagan odam ko'rmasin degani.
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

    const title = document.getElementById('fTitle').value.trim();
    const level = document.getElementById('fLevel').value;
    const text = document.getElementById('fText').value.trim();
    const audioFile = document.getElementById('fAudio').files[0];

    const record = {
      title,
      level,
      text,
      audioUrl: '', // Firebase Storage ulanganda shu yerga yuklangan fayl URL'i yoziladi
      createdAt: new Date().toISOString()
    };

    if (window.__FIREBASE_READY__) {
      // TODO: Firestore'ga yozish va Storage'ga audio yuklash shu yerda bo'ladi.
      // await addDoc(collection(db, 'texts'), record);
    } else {
      // Demo rejim: natijani ko'rsatamiz va localStorage'ga qo'shamiz,
      // shunda Firebase ulanmasdan oldin ham formani sinab ko'rish mumkin.
      const saved = JSON.parse(localStorage.getItem('tanass_draft_texts') || '[]');
      saved.push(record);
      localStorage.setItem('tanass_draft_texts', JSON.stringify(saved));
    }

    document.getElementById('resultJson').textContent = JSON.stringify(record, null, 2)
      + (audioFile ? `\n\n(audio fayl tanlandi: ${audioFile.name} — Firebase ulanganda avtomatik yuklanadi)` : '');
    document.getElementById('resultBox').style.display = 'block';
    textForm.reset();
  });
})();
