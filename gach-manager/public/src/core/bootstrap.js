(async function(){
  await GM_storage.init();
  GM_stateAPI.loadFromStorage();
  
  // ⭐ THÊM: Đợi cloud sync xong (hoặc timeout 5s)
  const cloudSyncPromise = new Promise(resolve => {
    const handler = () => {
      window.removeEventListener('gm:cloud-synced', handler);
      resolve();
    };
    window.addEventListener('gm:cloud-synced', handler);
    
    // Timeout after 5s
    setTimeout(resolve, 5000);
  });
  
  await cloudSyncPromise;
  
  // Seed sample nếu vẫn empty (sau khi đã try load từ cloud)
  if(GM_state.products.length===0){
    GM_state.products.push({ 
      id: GM_utils.uid(), 
      name:'Gạch 60x60 Prime', 
      code:'PR-6060', 
      factory:'Prime', 
      size:'60x60', 
      material:'Men', 
      surface:'Bóng', 
      price:120000, 
      unit:'m2' 
    });
    await GM_stateAPI.persistAll();
  }
  
  GM_router.start();
  setupAutoBackup();
  console.log('[Bootstrap] App started');
})();