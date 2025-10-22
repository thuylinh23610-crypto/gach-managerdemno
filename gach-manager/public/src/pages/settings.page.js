(function(){
  GM_router.register('settings', renderSettingsPage);
  function renderSettingsPage(root){
    root.innerHTML = `<div class='page-head'><h2>⚙️ Cài đặt / Sao lưu</h2></div>
      <div class='panel'>
        <h3>Sao lưu dữ liệu</h3>
        <p>Tải xuống toàn bộ dữ liệu (JSON) để lưu trữ an toàn.</p>
        <div style='display:flex;gap:12px;flex-wrap:wrap;'>
          <button class='btn' id='btn-export-json'>⬇️ Xuất JSON</button>
          <button class='btn danger' id='btn-export-and-clear'>🗑️ Xuất JSON & Xóa</button>
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
    // Show confirmation modal
    const confirmModal = document.createElement('div');
    confirmModal.innerHTML = `
      <div class="modal-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;">
        <div class="modal-content" style="background:white;padding:24px;border-radius:12px;max-width:500px;margin:20px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1),0 10px 10px -5px rgba(0,0,0,0.04);">
          <h3 style="margin:0 0 16px 0;color:#dc2626;font-size:20px;">⚠️ Cảnh báo</h3>
          <p style="margin:0 0 16px 0;color:#374151;line-height:1.5;">
            Bạn có chắc chắn muốn <strong>xuất dữ liệu và xóa toàn bộ</strong> không?<br>
            <strong style="color:#dc2626;">Hành động này không thể hoàn tác!</strong>
          </p>
          <div style="display:flex;gap:12px;justify-content:flex-end;">
            <button id="cancel-export-clear" class="btn ghost">Hủy</button>
            <button id="confirm-export-clear" class="btn danger">Xuất & Xóa</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(confirmModal);
    
    return new Promise((resolve) => {
      document.getElementById('cancel-export-clear').onclick = () => {
        document.body.removeChild(confirmModal);
        resolve(false);
      };
      
      document.getElementById('confirm-export-clear').onclick = async () => {
        document.body.removeChild(confirmModal);
        
        try {
          // First export the data
          const data = GM_storage.exportAll();
          const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
          const a = document.createElement('a'); 
          a.download = 'gach-manager-backup-before-clear-' + Date.now() + '.json'; 
          a.href = URL.createObjectURL(blob); 
          a.click(); 
          setTimeout(() => URL.revokeObjectURL(a.href), 5000);
          
          // Then clear all data
          await GM_storage.clear();
          
          // Reset in-memory state
          GM_state.products = [];
          GM_state.imports = [];
          GM_state.exports = [];
          GM_state.history = [];
          GM_state.customers = [];
          
          // ✅ PUSH snapshot rỗng lên Firestore để đồng bộ với các thiết bị khác
          if (window.GM_realtime?.pushAll) {
            await window.GM_realtime.pushAll();
          }
          
          // Show success modal
          const successModal = document.createElement('div');
          successModal.innerHTML = `
            <div class="modal-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;">
              <div class="modal-content" style="background:white;padding:24px;border-radius:12px;max-width:400px;margin:20px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1),0 10px 10px -5px rgba(0,0,0,0.04);text-align:center;">
                <div style="margin-bottom:16px;font-size:48px;">✅</div>
                <h3 style="margin:0 0 8px 0;color:#059669;">Thành công!</h3>
                <p style="margin:0 0 16px 0;color:#374151;">
                  Dữ liệu đã được xuất và toàn bộ dữ liệu đã được xóa.
                </p>
                <button id="close-success" class="btn">Đóng</button>
              </div>
            </div>
          `;
          
          document.body.appendChild(successModal);
          
          document.getElementById('close-success').onclick = () => {
            document.body.removeChild(successModal);
            // Redirect to home page
            GM_router.go('products');
          };
          
          resolve(true);
        } catch(error) {
          console.error('Error during export and clear:', error);
          GM_ui.toast('Có lỗi xảy ra khi xuất và xóa dữ liệu', 'error');
          resolve(false);
        }
      };
    });
  }
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
      
      // ✅ PUSH snapshot mới lên Firestore để đồng bộ
      if (window.GM_realtime?.pushAll) {
        await window.GM_realtime.pushAll();
      }
      
      GM_ui.toast('Nhập dữ liệu thành công');
    } catch(e){ console.error(e); GM_ui.toast('Lỗi nhập'); }
  }
})();