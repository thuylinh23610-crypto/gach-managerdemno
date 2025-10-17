// Realtime two-way sync: Firestore <-> Local State
// Scope: receipts (exports) and products can be added incrementally.
(function(){
  function ready(){ return !!(window.firebaseDb && window.FB); }
  if(!ready()) { console.warn('RealtimeSync: Firebase not ready, listener not attached'); return; }
  const { onSnapshot, collection } = window.FB;

  // ISO string fallback compare
  function newer(remote, local){
    const r = remote?._syncedAt || remote?._serverSyncedAt || 0;
    const l = local?._syncedAt || 0;
    try { return (typeof r === 'string' ? Date.parse(r) : 0) > (typeof l === 'string' ? Date.parse(l) : 0); } catch(_) { return true; }
  }

  // Merge remote array of docs into a local array by id
  function mergeArray(localArr, remoteArr){
    const byId = Object.create(null);
    localArr.forEach(x => { if(x && x.id) byId[x.id]=x; });
    remoteArr.forEach(r => {
      const id = r.id; if(!id) return;
      const exist = byId[id];
      if(!exist) {
        localArr.push(r);
      } else if (newer(r, exist)) {
        Object.assign(exist, r);
      }
    });
  }

  // Listen products
  try {
    onSnapshot(collection(window.firebaseDb, 'products'), (snap) => {
      const remote = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if(!Array.isArray(GM_state.products)) GM_state.products = [];
      mergeArray(GM_state.products, remote);
      // Persist silently
      if (window.GM_storage && window.GM_CONST) {
        GM_storage.write(GM_CONST.STORAGE.PRODUCTS, GM_state.products).catch(()=>{});
      }
    });
  } catch(e){ console.warn('RealtimeSync products failed', e); }

  // Listen export receipts
  try {
    onSnapshot(collection(window.firebaseDb, 'receipts_export'), (snap) => {
      const remote = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if(!Array.isArray(GM_state.exports)) GM_state.exports = [];
      mergeArray(GM_state.exports, remote);
      // Also update history based on receipt items if needed (lightweight; skip regen to avoid duplication)
      if (window.GM_storage && window.GM_CONST) {
        GM_storage.write(GM_CONST.STORAGE.EXPORTS, GM_state.exports).catch(()=>{});
      }
    });
  } catch(e){ console.warn('RealtimeSync exports failed', e); }

  // Listen import receipts
  try {
    onSnapshot(collection(window.firebaseDb, 'receipts_import'), (snap) => {
      const remote = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if(!Array.isArray(GM_state.imports)) GM_state.imports = [];
      mergeArray(GM_state.imports, remote);
      if (window.GM_storage && window.GM_CONST) {
        GM_storage.write(GM_CONST.STORAGE.IMPORTS, GM_state.imports).catch(()=>{});
      }
    });
  } catch(e){ console.warn('RealtimeSync imports failed', e); }

  // Listen customers
  try {
    onSnapshot(collection(window.firebaseDb, 'customers'), (snap) => {
      const remote = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if(!Array.isArray(GM_state.customers)) GM_state.customers = [];
      mergeArray(GM_state.customers, remote);
      if (window.GM_storage && window.GM_CONST) {
        GM_storage.write(GM_CONST.STORAGE.CUSTOMERS, GM_state.customers).catch(()=>{});
      }
    });
  } catch(e){ console.warn('RealtimeSync customers failed', e); }

  // Listen history (append-only)
  try {
    onSnapshot(collection(window.firebaseDb, 'history'), (snap) => {
      const remote = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if(!Array.isArray(GM_state.history)) GM_state.history = [];
      mergeArray(GM_state.history, remote);
      if (window.GM_storage && window.GM_CONST) {
        GM_storage.write(GM_CONST.STORAGE.HISTORY, GM_state.history).catch(()=>{});
      }
    });
  } catch(e){ console.warn('RealtimeSync history failed', e); }
})();
