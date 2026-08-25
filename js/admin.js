(function () {
  // Vaqtinchalik oddiy parol tekshiruvi.
  // MUHIM: bu faqat boshlang'ich himoya. Keyinroq Firebase Auth
  // (admin UID tekshiruvi) bilan almashtirish kerak.
  const ADMIN_PASS = 'tanass2026';

  const loginBox = document.getElementById('loginBox');
  const textForm = document.getElementById('textForm');
  const listSection = document.getElementById('listSection');
  const adminList = document.getElementById('adminList');
  const submitBtn = document.getElementById('submitBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');

  let editingId = null;

  function unlock() {
    loginBox.style.display = 'none';
    textForm.style.display = 'block';
    listSection.style.display = 'block';
    loadList();
    checkDrafts();
  }

  async function checkDrafts() {
    const drafts = JSON.parse(localStorage.getItem('tanass_draft_texts') || '[]');
    if (drafts.length === 0) return;
    const banner = document.createElement('div');
    banner.style.cssText = 'background:var(--accent-soft);border:1px solid var(--accent);border-radius:var(--radius-md);padding:12px 14px;margin-bottom:16px;font-size:13px;';
    banner.innerHTML = `
      <b>${drafts.length} ta saqlanmagan matn topildi</b> (Firebase ulanmasdan oldin qo'shilgan, shu qurilmada saqlangan).<br>
      <button type="button" id="migrateBtn" class="btn-primary" style="margin-top:8px;width:auto;padding:8px 16px;font-size:13px;">Firestore'ga ko'chirish</button>
    `;
    textForm.parentElement.insertBefore(banner, textForm);
    document.getElementById('migrateBtn').addEventListener('click', async () => {
      const fbs = await window.firebaseReady;
      if (!fbs) { alert("Firebase ulanmagan."); return; }
      for (const rec of drafts) {
        await fbs.addDoc(fbs.collection(fbs.db, 'texts'), {
          title: rec.title, level: rec.level, text: rec.text,
          audioUrl: rec.audioUrl || '', progress: 0,
          createdAt: fbs.serverTimestamp()
        });
      }
      localStorage.removeItem('tanass_draft_texts');
      banner.remove();
      loadList();
      alert(`${drafts.length} ta matn muvaffaqiyatli ko'chirildi.`);
    });
  }

  document.getElementById('loginBtn').addEventListener('click', () => {
    const val = document.getElementById('adminPass').value;
    if (val === ADMIN_PASS) {
      sessionStorage.setItem('tanass_admin_ok', '1');
      unlock();
    } else {
      alert("Parol noto'g'ri");
    }
  });

  if (sessionStorage.getItem('tanass_admin_ok') === '1') unlock();

  function fillForm(rec) {
    document.getElementById('fTitle').value = rec.title || '';
    document.getElementById('fLevel').value = rec.level || 'B1';
    document.getElementById('fText').value = rec.text || '';
    document.getElementById('fAudio').value = rec.audioUrl || '';
  }

  function startEdit(id, rec) {
    editingId = id;
    fillForm(rec);
    submitBtn.textContent = 'Yangilash';
    cancelEditBtn.style.display = 'block';
    document.getElementById('resultBox').style.display = 'none';
    textForm.scrollIntoView({ behavior: 'smooth' });
  }

  function stopEdit() {
    editingId = null;
    textForm.reset();
    document.getElementById('fLevel').value = 'B1';
    submitBtn.textContent = 'Saqlash';
    cancelEditBtn.style.display = 'none';
  }

  cancelEditBtn.addEventListener('click', stopEdit);

  async function loadList() {
    const fbs = await window.firebaseReady;
    if (!fbs) {
      adminList.innerHTML = '<p style="color:var(--ink-soft);font-size:13px;">Firebase ulanmagan.</p>';
      return;
    }
    try {
      const q = fbs.query(fbs.collection(fbs.db, 'texts'), fbs.orderBy('createdAt', 'desc'));
      const snap = await fbs.getDocs(q);
      if (snap.empty) {
        adminList.innerHTML = '<p style="color:var(--ink-soft);font-size:13px;">Hali matn yo\'q.</p>';
        return;
      }
      adminList.innerHTML = '';
      snap.docs.forEach((d) => {
        const rec = d.data();
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:10px 12px;';
        row.innerHTML = `
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${rec.title || '(nomsiz)'}</div>
            <div style="font-size:12px;color:var(--ink-soft);">${rec.level || ''}</div>
          </div>
          <button type="button" class="btn-secondary edit-btn" style="width:auto;padding:8px 14px;font-size:13px;">Tahrirlash</button>
          <button type="button" class="btn-secondary del-btn" style="width:auto;padding:8px 14px;font-size:13px;color:var(--danger);">O'chirish</button>
        `;
        row.querySelector('.edit-btn').addEventListener('click', () => startEdit(d.id, rec));
        row.querySelector('.del-btn').addEventListener('click', async () => {
          if (!confirm(`"${rec.title}" o'chirilsinmi? Bu ortga qaytarilmaydi.`)) return;
          await fbs.deleteDoc(fbs.doc(fbs.db, 'texts', d.id));
          if (editingId === d.id) stopEdit();
          loadList();
        });
        adminList.appendChild(row);
      });
    } catch (e) {
      console.error(e);
      adminList.innerHTML = '<p style="color:var(--danger);font-size:13px;">Ro\'yxatni yuklashda xatolik.</p>';
    }
  }

  textForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = editingId ? 'Yangilanmoqda...' : 'Saqlanmoqda...';

    const title = document.getElementById('fTitle').value.trim();
    const level = document.getElementById('fLevel').value;
    const text = document.getElementById('fText').value.trim();
    const audioUrl = document.getElementById('fAudio').value.trim();

    try {
      const fbs = await window.firebaseReady;

      if (editingId) {
        if (fbs) {
          await fbs.updateDoc(fbs.doc(fbs.db, 'texts', editingId), { title, level, text, audioUrl });
        }
        document.getElementById('resultJson').textContent = `"${title}" yangilandi.`;
      } else {
        const record = {
          title, level, text, audioUrl,
          progress: 0,
          createdAt: fbs ? fbs.serverTimestamp() : new Date().toISOString()
        };
        if (fbs) {
          await fbs.addDoc(fbs.collection(fbs.db, 'texts'), record);
        } else {
          const saved = JSON.parse(localStorage.getItem('tanass_draft_texts') || '[]');
          saved.push(record);
          localStorage.setItem('tanass_draft_texts', JSON.stringify(saved));
        }
        document.getElementById('resultJson').textContent = `"${title}" saqlandi. Bosh sahifada darhol ko'rinadi.`;
      }

      document.getElementById('resultBox').style.display = 'block';
      stopEdit();
      loadList();
    } catch (err) {
      console.error(err);
      alert("Xatolik: " + err.message + "\n\nFirestore qoidalarini (rules) tekshiring.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = editingId ? 'Yangilash' : 'Saqlash';
    }
  });
})();
