(function(){
  GM_router.register('settings', renderSettingsPage);
  function renderSettingsPage(root){
    root.innerHTML = `<div class='page-head'><h2>⚙️ Cài đặt / Sao lưu</h2></div>
      <div class='panel'>
        <h3>Sao lưu dữ liệu</h3>
        <p>Tải xuống toàn bộ dữ liệu (JSON) để lưu trữ an toàn.</p>
        <div style='display:flex;gap:8px;flex-wrap:wrap'>
          <button class='btn' id='btn-export-json'>⬇️ Xuất JSON</button>
          <button class='btn' id='btn-export-and-clear' title='Xuất toàn bộ dữ liệu ra JSON rồi XÓA toàn bộ dữ liệu trong hệ thống'>⬇️ Xuất JSON và XÓA</button>
        </div>
      </div>
      <div class='panel'>
        <h3>Phục hồi dữ liệu</h3>
        <p>Tải lên tệp JSON đã xuất trước đó. Dữ liệu hiện tại sẽ bị ghi đè theo từng bảng.</p>
        <input type='file' id='import-file' accept='application/json' />
        <button class='btn' id='btn-import-json'>⬆️ Nhập JSON</button>
      </div>`;
    document.getElementById('btn-export-json').onclick= doExport;
    document.getElementById('btn-export-and-clear').onclick= doExportAndClear;
    document.getElementById('btn-import-json').onclick= doImport;
  }
  function doExport(){
    const data = GM_storage.exportAll();
    const blob=new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
    const a=document.createElement('a'); a.download='gach-manager-backup-'+Date.now()+'.json'; a.href=URL.createObjectURL(blob); a.click(); setTimeout(()=> URL.revokeObjectURL(a.href), 5000);
    GM_ui.toast('Đã xuất dữ liệu');
  }
  async function doExportAndClear(){
    try {
      // 1) Xuất JSON trước
      const data = GM_storage.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.download = 'gach-manager-backup-' + Date.now() + '.json';
      a.href = URL.createObjectURL(blob);
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);

      // 2) Xác nhận xóa toàn bộ
      const ok = await GM_ui.confirmBox('Bạn có chắc chắn muốn XÓA toàn bộ dữ liệu sau khi đã xuất JSON? Hành động này không thể hoàn tác.');
      if(!ok) return;

      const btn = document.getElementById('btn-export-and-clear');
      const prevText = btn.textContent;
      btn.disabled = true; btn.textContent = 'Đang xóa...';

      // 3) Thử xóa trên Cloud (nếu có cấu hình Firebase)
      try {
        const db = window.firebaseDb; const FB = window.FB;
        if (db && FB) {
          const colNames = ['products','receipts_export','receipts_import','customers','history'];
          for (const name of colNames) {
            try {
              const colRef = FB.collection(db, name);
              const snap = await FB.getDocs(colRef);
              // Xóa tuần tự để giảm rủi ro giới hạn
              for (const d of snap.docs) {
                try { await FB.deleteDoc(FB.doc(colRef, d.id)); } catch(_) {}
              }
            } catch (e) { console.warn('Cloud clear failed for', name, e); }
          }
        }
      } catch (e) { console.warn('Cloud clear error', e); }

      // 4) Xóa dữ liệu local (state + storage)
      try { localStorage.removeItem('GM_trash_items'); } catch {}
      GM_state.products = [];
      GM_state.imports = [];
      GM_state.exports = [];
      GM_state.customers = [];
      GM_state.history = [];
      try { await GM_stateAPI.persistAll(); } catch(e){ console.error('Persist after clear failed', e); }

      // 5) Phát sự kiện thay đổi state cho toàn app biết & thông báo hoàn tất
      try { window.dispatchEvent(new CustomEvent('gm:state:changed', { detail: { key: 'all-cleared' } })); } catch {}
      GM_ui.toast('Đã XÓA toàn bộ dữ liệu (sau khi xuất JSON)');
      btn.disabled = false; btn.textContent = prevText;
    } catch (e) {
      console.error(e);
      GM_ui.toast('Có lỗi khi xuất/xóa dữ liệu');
      try {
        const btn = document.getElementById('btn-export-and-clear');
        btn.disabled = false; btn.textContent = '⬇️ Xuất JSON và XÓA';
      } catch {}
    }
  }

  // Expose global helper so other pages (e.g., Stock) can invoke
  try { window.GM_exportAndClear = doExportAndClear; } catch {}
  async function doImport(){
    const file = document.getElementById('import-file').files[0]; if(!file){ GM_ui.toast('Chọn tệp JSON'); return; }
    try {
      const text = await file.text(); const obj=JSON.parse(text);
      await GM_storage.importAll(obj);
      // Reload in-memory state
      GM_state.products = GM_storage.read(GM_CONST.STORAGE.PRODUCTS);
      GM_state.imports = GM_storage.read(GM_CONST.STORAGE.IMPORTS);
      GM_state.exports = GM_storage.read(GM_CONST.STORAGE.EXPORTS);
      GM_state.history = GM_storage.read(GM_CONST.STORAGE.HISTORY);
      GM_state.customers = GM_storage.read(GM_CONST.STORAGE.CUSTOMERS);
      GM_ui.toast('Nhập dữ liệu thành công');
    } catch(e){ console.error(e); GM_ui.toast('Lỗi nhập'); }
  }
})();