(function(){
  GM_router.register('settings', renderSettingsPage);
  function renderSettingsPage(root){
    root.innerHTML = `<div class='page-head'><h2>⚙️ Cài đặt / Sao lưu</h2></div>
      <div class='panel'>
        <h3>Sao lưu dữ liệu</h3>
        <p>Tải xuống toàn bộ dữ liệu (JSON) để lưu trữ an toàn.</p>
        <button class='btn' id='btn-export-json'>⬇️ Xuất JSON</button>
      </div>
      <div class='panel'>
        <h3>Phục hồi dữ liệu</h3>
        <p>Tải lên tệp JSON đã xuất trước đó. Dữ liệu hiện tại sẽ bị ghi đè theo từng bảng.</p>
        <input type='file' id='import-file' accept='application/json' />
        <button class='btn' id='btn-import-json'>⬆️ Nhập JSON</button>
      </div>`;
    document.getElementById('btn-export-json').onclick= doExport;
    document.getElementById('btn-import-json').onclick= doImport;
  }
  function doExport(){
    const data = GM_storage.exportAll();
    const blob=new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
    const a=document.createElement('a'); a.download='gach-manager-backup-'+Date.now()+'.json'; a.href=URL.createObjectURL(blob); a.click(); setTimeout(()=> URL.revokeObjectURL(a.href), 5000);
    GM_ui.toast('Đã xuất dữ liệu');
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
      GM_ui.toast('Nhập dữ liệu thành công');
    } catch(e){ console.error(e); GM_ui.toast('Lỗi nhập'); }
  }
})();