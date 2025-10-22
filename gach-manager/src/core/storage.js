// IndexedDB primary + localStorage fallback
window.GM_storage = (function(){
  const DB_NAME='GachManagerDB_v2';
  const STORE='store';
  let db=null; let ready=false; let cache={};
  const KEYS = Object.values(GM_CONST.STORAGE);

  function openDB(){
    return new Promise((res,rej)=>{
      const req = indexedDB.open(DB_NAME,1);
      req.onupgradeneeded = e=>{ const d=e.target.result; if(!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE); };
      req.onsuccess = e=> res(e.target.result);
      req.onerror = e=> rej(e.target.error);
    });
  }
  function idbGet(key){ return new Promise(r=>{ if(!db) return r(undefined); const tx=db.transaction(STORE,'readonly'); const store=tx.objectStore(STORE); const rq=store.get(key); rq.onsuccess=()=>r(rq.result? JSON.parse(rq.result):undefined); rq.onerror=()=>r(undefined); }); }
  function idbPut(key,val){ return new Promise(r=>{ if(!db) return r(false); const tx=db.transaction(STORE,'readwrite'); const store=tx.objectStore(STORE); const rq=store.put(JSON.stringify(val),key); rq.onsuccess=()=>r(true); rq.onerror=()=>r(false); }); }

  function lsRead(key){ try{return JSON.parse(localStorage.getItem(key)||'[]');}catch{return [];} }
  function lsWrite(key,val){
    // Guard localStorage writes to avoid QuotaExceededError on large payloads (e.g., images)
    try{
      localStorage.setItem(key, JSON.stringify(val));
      return true;
    }catch(e){
      // If quota exceeded, caller may ignore this when IDB is available
      if (e && (e.name === 'QuotaExceededError' || e.code === 22)) {
        console.warn('[storage] localStorage quota exceeded for', key);
        return false;
      }
      throw e;
    }
  }

  async function init(){
  try { db = await openDB(); } catch(e){ console.warn('[storage] IDB unavailable', e); }
    // Load cache
    for(const k of KEYS){
      let data = db? await idbGet(k): undefined;
      if(data === undefined){
        // If DB empty, try to seed from LS once; otherwise default empty
        const ls = lsRead(k);
        if(db){
          if(Array.isArray(ls) && ls.length>0){ await idbPut(k, ls); data = ls; }
          else data = [];
        } else {
          data = Array.isArray(ls) ? ls : [];
        }
      }
      cache[k]=data;
    }
    ready=true;
    console.log('[storage] Ready. IDB:', !!db);
  }

  function read(key){ return cache[key] ? JSON.parse(JSON.stringify(cache[key])): []; }
  async function write(key,data){
    cache[key]=data;
    let lsOk = false;
    try {
      lsOk = lsWrite(key,data);
    } catch(e){
      // Unexpected LS error (not quota). If no DB, rethrow.
      if(!db) throw e;
    }
    // Always write to IDB when available
    if(db) await idbPut(key,data);
    else if(!lsOk){
      // Neither IDB nor LS worked
      throw new Error('[storage] Persist failed: no durable storage available');
    }
    try { window.dispatchEvent(new CustomEvent('gm:storage-changed', { detail: { key } })); } catch {}
  }
  function exportAll(){ const out={}; KEYS.forEach(k=> out[k]=read(k)); return out; }
  async function importAll(obj){ 
    for(const [k,v] of Object.entries(obj)){ if(KEYS.includes(k)){ await write(k, v); } }
    try { window.dispatchEvent(new Event('gm:storage-changed')); } catch {}
  }

  async function clear(){
    // Clear all data in cache and storage
    for(const k of KEYS){
      cache[k] = [];
      // Clear from localStorage
      try { localStorage.removeItem(k); } catch(e) { console.warn('[storage] LS clear failed for', k, e); }
      // Clear from IndexedDB
      if(db){
        try {
          const tx = db.transaction(STORE, 'readwrite');
          const store = tx.objectStore(STORE);
          store.delete(k);
        } catch(e) { console.warn('[storage] IDB clear failed for', k, e); }
      }
    }
    try { window.dispatchEvent(new Event('gm:storage-changed')); } catch {}
  }

  return { init, read, write, exportAll, importAll, clear };
})();