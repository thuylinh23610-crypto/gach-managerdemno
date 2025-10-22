(async function(){
  await GM_storage.init();
  GM_stateAPI.loadFromStorage();
  // Seed sample if empty
  if(GM_state.products.length===0){
    GM_state.products.push({ id: GM_utils.uid(), name:'Gạch 60x60 Prime', code:'PR-6060', factory:'Prime', size:'60x60', material:'Men', surface:'Bóng', price:120000, unit:'m2' });
    await GM_stateAPI.persistAll();
  }
  // Register pages lazily (pages files will attach themselves)
  GM_router.start();
  setupAutoBackup();
  console.log('[Bootstrap] App started');
})();

function setupAutoBackup(){
  const KEY='gm_auto_backups';
  const THRESHOLD=50; // tăng ngưỡng lên 50 sự kiện
  const BACKUP_INTERVAL = 5 * 60 * 1000; // 5 phút
  
  let backupsCache = null;
  function loadBackups(){ 
    if (backupsCache) return backupsCache;
    try {
      backupsCache = JSON.parse(localStorage.getItem(KEY)||'[]');
      return backupsCache;
    } catch {
      return [];
    }
  }
  
  function saveBackups(arr){ 
    backupsCache = arr;
    localStorage.setItem(KEY, JSON.stringify(arr.slice(-10))); 
  }
  
  function snapshot(){
    const data = GM_storage.exportAll();
    // Avoid creating too-large backups when data contains big images
    try{
      const json = JSON.stringify(data);
      const size = (window.TextEncoder? new TextEncoder().encode(json).length : json.length);
      // Skip backup if larger than 10MB to prevent LS overflow
      if(size > 10 * 1024 * 1024){
        console.warn('[AutoBackup] Snapshot skipped due to large size >10MB');
        return;
      }
    }catch{}
    const backups = loadBackups();
    backups.push({ ts: Date.now(), data });
    saveBackups(backups);
    console.log('[AutoBackup] snapshot saved', new Date().toLocaleString());
  }
  
  let lastCount = GM_state.history.length;
  let lastBackupTime = Date.now();
  
  setInterval(()=>{
    const cur = GM_state.history.length;
    if(cur - lastCount >= THRESHOLD){
      lastCount = cur; snapshot();
    }
  }, 5000);
  window.GM_autoBackup = { manual: snapshot, list: ()=> loadBackups() };
}