window.GM_products = (function(){
  const S = GM_CONST.STORAGE;
  function list(includeDeleted=false){ return GM_state.products.filter(p=> includeDeleted || !p.deletedAt); }
  function get(id){ return GM_state.products.find(p=> p.id===id); }
  async function create(data){
    data.id = GM_utils.uid();
    GM_state.products.push(data);
    await persist();
    // cloud sync (upsert)
    try { await cloudUpsert(data); } catch(_) {}
    return data;
  }
  async function update(id, patch){
    const p=get(id); if(!p) return null;
    const oldPrice = p.price;
    Object.assign(p, patch);
    await persist();
    // cloud sync (upsert)
    try { await cloudUpsert(p); } catch(_) {}
    if(patch.price!=null && oldPrice!==patch.price){
      GM_state.history.push({ id:GM_utils.uid(), type:'price_change', productId:p.id, productCode:p.code, oldPrice, newPrice:p.price, date:GM_utils.nowISO() });
      await GM_storage.write(S.HISTORY, GM_state.history);
    }
    return p;
  }
  async function softDelete(id){ 
    const p=get(id); 
    if(!p) return false; 
    
    // Move to trash instead of soft delete
    if (window.GM_trash) {
      GM_trash.add(p, 'product');
    }
    
    // Remove from products list
    const index = GM_state.products.findIndex(prod => prod.id === id);
    if (index > -1) {
      GM_state.products.splice(index, 1);
    }
    
    addHistory('delete', p); 
    await persistWithHistory();
    // cloud sync (delete)
    try { await cloudDelete(id); } catch(_) {}
    return true; 
  }
  
  async function hardDelete(id){ 
    const p=get(id); 
    if(!p) return false; 
    
    // Permanently remove from products list
    const index = GM_state.products.findIndex(prod => prod.id === id);
    if (index > -1) {
      GM_state.products.splice(index, 1);
    }
    
    addHistory('permanent_delete', p); 
    await persistWithHistory();
    // cloud sync (delete)
    try { await cloudDelete(id); } catch(_) {}
    return true; 
  }
  
  async function restore(id){ 
    const p=get(id); 
    if(!p) return false; 
    delete p.deletedAt; 
    addHistory('restore', p); 
    await persistWithHistory();
    // cloud sync (upsert)
    try { await cloudUpsert(p); } catch(_) {}
    return true; 
  }
  
  // Add new method for adding products (used by trash restore)
  async function add(productData) {
    // Ensure unique ID
    if (!productData.id || GM_state.products.find(p => p.id === productData.id)) {
      productData.id = GM_utils.uid();
    }
    
    GM_state.products.push(productData);
    await persist();
    // cloud sync (upsert)
    try { await cloudUpsert(productData); } catch(_) {}
    return productData;
  }
  
  // Check if product exists by ID
  function exists(id) {
    return GM_state.products.some(p => p.id === id);
  }
  function addHistory(type, product){ GM_state.history.push({ id:GM_utils.uid(), type, productId:product.id, productCode:product.code, date:GM_utils.nowISO() }); }
  function search(q){ q=q.toLowerCase(); return list().filter(p=> [p.name,p.code,p.factory,p.size].some(v=> (v||'').toLowerCase().includes(q))); }
  async function persist(){ await GM_storage.write(S.PRODUCTS, GM_state.products); }
  async function persistWithHistory(){ await GM_storage.write(S.PRODUCTS, GM_state.products); await GM_storage.write(S.HISTORY, GM_state.history); }
  
  // Cloud helpers
  function hasCloud(){ const db = window.firebaseDb; const FB = window.FB; return (db && FB) ? { db, FB } : null; }
  async function cloudUpsert(p){
    const h = hasCloud(); if (!h) return false;
    const { db, FB } = h;
    const col = FB.collection(db, 'products');
    const id = p.id || GM_utils.uid();
    const ref = FB.doc(col, id);
    const payload = { ...p, _syncedAt: new Date().toISOString(), _serverSyncedAt: FB.serverTimestamp() };
    await FB.setDoc(ref, payload);
    return true;
  }
  async function cloudDelete(id){
    const h = hasCloud(); if (!h) return false;
    const { db, FB } = h;
    const ref = FB.doc(FB.collection(db, 'products'), id);
    await FB.deleteDoc(ref);
    return true;
  }
  
  // Optional: bulk helpers (no-op if Firebase not loaded)
  async function cloudPushAll() {
    const db = window.firebaseDb; const FB = window.FB; if (!db || !FB) return false;
    const col = FB.collection(db, 'products');
    // Simple push: write each product as doc with id
    for (const p of GM_state.products) {
      const ref = FB.doc(col, p.id || GM_utils.uid());
      const payload = { ...p, _syncedAt: new Date().toISOString() };
      await FB.setDoc(ref, payload);
    }
    return true;
  }
  async function cloudPullAll() {
    const db = window.firebaseDb; const FB = window.FB; if (!db || !FB) return null;
    const snap = await FB.getDocs(FB.collection(db, 'products'));
    const server = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return server;
  }
  
  return { list, get, create, update, softDelete, hardDelete, restore, search, add, exists, cloudPushAll, cloudPullAll };
})();