// Snapshot-based realtime sync: push full snapshot on local changes,
// import snapshot on remote changes. Handles add/update/delete/import/clear.
(function(){
  if (window.__gmRealtimePatched) return;
  window.__gmRealtimePatched = true;

  function startRealtime(){
    const fb = window.GM_fb;
    if(!fb || !fb.db) return;

    const clientId = localStorage.getItem('gm_client_id') || (crypto.randomUUID?.() || String(Date.now()));
    localStorage.setItem('gm_client_id', clientId);

    const snapRef = fb.doc(fb.db, 'gm', 'snapshot');
    let importing = false;
    let debounceTimer = null;
    let lastRemoteVersion = 0;

    async function pushAll(){
      if(importing) return;
      try{
        const snapshot = GM_storage.exportAll();
        const nextVer = (lastRemoteVersion || 0) + 1;
        await fb.setDoc(snapRef, {
          data: snapshot,
          version: nextVer,
          updatedAt: fb.serverTimestamp(),
          lastWriterId: clientId
        }, { merge: true });
        lastRemoteVersion = nextVer;
        console.log('[RealtimeSync] Push version', nextVer);
      }catch(e){ console.error('[RealtimeSync] Push fail', e); }
    }

    // Optional manual trigger
    window.GM_realtime = { pushAll };

    // Initialize version
    fb.getDoc(snapRef).then(s=>{ if(s.exists()) lastRemoteVersion = s.data()?.version || 0; }).catch(()=>{});

    // Remote -> Local
    fb.onSnapshot(snapRef, (snap)=>{
      if(!snap.exists()) return;
      const data = snap.data();
      if(data.lastWriterId === clientId) return;
      const ver = data.version || 0;
      if(ver <= (lastRemoteVersion || 0)) return;
      lastRemoteVersion = ver;
      try{
        importing = true;
        GM_storage.importAll(data.data || {});
        console.log('[RealtimeSync] Pull version', ver);
      } finally { importing = false; }
      // Notify UI to refresh current page if needed
      try { window.dispatchEvent(new CustomEvent('gm:data-updated', { detail: { source: 'cloud', version: ver } })); } catch {}
    }, err=> console.error('[RealtimeSync] onSnapshot error', err));

    // Wrap write -> debounce push
    if(!GM_storage.__rt_wrapped_write){
      const _write = GM_storage.write;
      GM_storage.write = async function(key, data){
        const r = await _write.call(GM_storage, key, data);
        if(!importing){
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(pushAll, 400);
        }
        return r;
      };
      GM_storage.__rt_wrapped_write = true;
    }

    // Wrap importAll -> push
    if(!GM_storage.__rt_wrapped_importAll){
      const _importAll = GM_storage.importAll;
      GM_storage.importAll = async function(obj){
        const r = await _importAll.call(GM_storage, obj);
        if(!importing){
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(pushAll, 400);
        }
        return r;
      };
      GM_storage.__rt_wrapped_importAll = true;
    }

    // Wrap clear -> quick push
    if(!GM_storage.__rt_wrapped_clear){
      const _clear = GM_storage.clear;
      GM_storage.clear = async function(){
        const r = await _clear.call(GM_storage);
        if(!importing){
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(pushAll, 200);
        }
        return r;
      };
      GM_storage.__rt_wrapped_clear = true;
    }

    console.log('[RealtimeSync] Attached listeners');
  }

  if(window.GM_fb?.db){ startRealtime(); }
  else { window.addEventListener('gm:firebase-ready', startRealtime, { once: true }); }
})();
