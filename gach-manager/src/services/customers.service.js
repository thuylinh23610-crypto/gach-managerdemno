window.GM_customers = (function(){
  const S=GM_CONST.STORAGE;
  function list(){ return GM_state.customers; }
  function get(id){ return GM_state.customers.find(c=> c.id===id); }
  async function create(data){
    data.id=GM_utils.uid(); GM_state.customers.push(data); await persist();
    try { await cloudUpsertCustomer(data); } catch(_) {}
    return data;
  }
  async function update(id,patch){ const c=get(id); if(!c) return null; Object.assign(c,patch); await persist(); try { await cloudUpsertCustomer(c); } catch(_) {} return c; }
  async function remove(id){ 
    const customer = get(id);
    if (!customer) return false;
    
    // Move to trash
    if (window.GM_trash) {
      GM_trash.add(customer, 'customer');
    }
    
    const idx=GM_state.customers.findIndex(c=> c.id===id); 
    if(idx>-1){ 
      GM_state.customers.splice(idx,1); 
      await persist();
      try { await cloudDeleteCustomer(id); } catch(_) {}
      return true;
    } 
    return false; 
  }
  
  // Add new method for adding customers (used by trash restore)
  async function add(customerData) {
    // Ensure unique ID
    if (!customerData.id || GM_state.customers.find(c => c.id === customerData.id)) {
      customerData.id = GM_utils.uid();
    }
    
    GM_state.customers.push(customerData);
    await persist();
    try { await cloudUpsertCustomer(customerData); } catch(_) {}
    return customerData;
  }
  
  // Check if customer exists by ID  
  function exists(id) {
    return GM_state.customers.some(c => c.id === id);
  }
  function search(q){ q=q.toLowerCase(); return list().filter(c=> [c.name,c.phone,c.address].some(v=> (v||'').toLowerCase().includes(q))); }
  async function persist(){ await GM_storage.write(S.CUSTOMERS, GM_state.customers); }
  
  // Cloud helpers
  function hasCloud(){ const db = window.firebaseDb; const FB = window.FB; return (db && FB) ? { db, FB } : null; }
  async function cloudUpsertCustomer(cus){
    const h = hasCloud(); if (!h) return false;
    const { db, FB } = h;
    const col = FB.collection(db, 'customers');
    const id = cus.id || GM_utils.uid();
    const ref = FB.doc(col, id);
    const payload = { ...cus, _syncedAt: new Date().toISOString(), _serverSyncedAt: FB.serverTimestamp() };
    await FB.setDoc(ref, payload, { merge: true });
    return true;
  }
  async function cloudDeleteCustomer(id){
    const h = hasCloud(); if (!h) return false;
    const { db, FB } = h;
    const ref = FB.doc(FB.collection(db, 'customers'), id);
    await FB.deleteDoc(ref);
    return true;
  }
  
  return { list, get, create, update, remove, search, add, exists };
})();