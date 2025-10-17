window.GM_history = (function(){
  const S=GM_CONST.STORAGE;
  function list(){ return GM_state.history.slice().sort((a,b)=> b.date.localeCompare(a.date)); }
  async function add(record){
    record.id=GM_utils.uid(); record.date = record.date || GM_utils.nowISO();
    GM_state.history.push(record);
    await persist();
    try { await cloudUpsertHistory(record); } catch(_) {}
  }
  async function persist(){ await GM_storage.write(S.HISTORY, GM_state.history); }
  
  // Cloud helpers
  function hasCloud(){ const db = window.firebaseDb; const FB = window.FB; return (db && FB) ? { db, FB } : null; }
  async function cloudUpsertHistory(his){
    const h = hasCloud(); if (!h) return false;
    const { db, FB } = h;
    const col = FB.collection(db, 'history');
    const id = his.id || GM_utils.uid();
    const ref = FB.doc(col, id);
    const payload = { ...his, _syncedAt: new Date().toISOString(), _serverSyncedAt: FB.serverTimestamp() };
    await FB.setDoc(ref, payload, { merge: true });
    return true;
  }
  
  return { list, add };
})();