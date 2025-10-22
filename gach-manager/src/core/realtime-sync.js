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
    let pushing = false;
    const pushQueue = [];

    function estimateSize(obj){
      try { return new Blob([JSON.stringify(obj)]).size; } catch { return 0; }
    }

    async function pushAllInternal(force=false, attempt=1){
      if(importing && !force) return;
      if(pushing){ pushQueue.push({ force }); return; }

      const snapshot = GM_storage.exportAll();
      const docSize = estimateSize(snapshot);
      if (docSize > 900_000) {
        console.warn('[RealtimeSync] Snapshot size near 1MB limit ~', docSize, 'bytes');
      }

      pushing = true;
      try{
        await fb.runTransaction(fb.db, async (tx)=>{
          const cur = await tx.get(snapRef);
          const curVer = cur.exists() ? (cur.data().version || 0) : 0;
          const nextVer = curVer + 1;
          tx.set(snapRef, {
            data: snapshot,
            version: nextVer,
            updatedAt: fb.serverTimestamp(),
            lastWriterId: clientId
          }, { merge: true });
          lastRemoteVersion = nextVer;
        });
        console.log('[RealtimeSync] Push version (tx)', lastRemoteVersion, force ? '(forced)' : '');
      }catch(e){
        const code = e?.code || e?.message || String(e);
        console.warn('[RealtimeSync] Push fail', code, 'attempt', attempt);
        if (attempt < 3 && /aborted|deadline|unavailable|failed-precondition/i.test(code)){
          await new Promise(r=>setTimeout(r, 300 + attempt*200));
          await pushAllInternal(force, attempt+1);
        } else {
          if (!navigator.onLine || /unavailable|network/i.test(code)){
            pushQueue.push({ force });
          }
        }
      } finally {
        pushing = false;
        const job = pushQueue.shift();
        if (job){
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(()=> pushAllInternal(job.force), 300);
        }
      }
    }

    async function pushAll(force=false){
      clearTimeout(debounceTimer);
      if (force) return pushAllInternal(true);
      debounceTimer = setTimeout(()=> pushAllInternal(false), 1200);
    }

    // Optional manual trigger
    window.GM_realtime = { pushAll, pushNow: ()=>pushAllInternal(true) };

    // Initialize version
    fb.getDoc(snapRef).then(s=>{ if(s.exists()) lastRemoteVersion = s.data()?.version || 0; }).catch(()=>{});

    // Remote -> Local
    fb.onSnapshot(snapRef, (snap)=>{
      if(!snap.exists()) return;
      const data = snap.data();
      if(data.lastWriterId === clientId){ lastRemoteVersion = Math.max(lastRemoteVersion, data.version||0); return; }
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
        if(!importing){ await pushAll(false); }
        return r;
      };
      GM_storage.__rt_wrapped_write = true;
    }

    // Wrap importAll -> push
    if(!GM_storage.__rt_wrapped_importAll){
      const _importAll = GM_storage.importAll;
      GM_storage.importAll = async function(obj){
        const r = await _importAll.call(GM_storage, obj);
        if(!importing){ await pushAll(false); }
        return r;
      };
      GM_storage.__rt_wrapped_importAll = true;
    }

    // Wrap clear -> quick push
    if(!GM_storage.__rt_wrapped_clear){
      const _clear = GM_storage.clear;
      GM_storage.clear = async function(){
        const r = await _clear.call(GM_storage);
        // clear -> force push immediately
        await pushAll(true);
        return r;
      };
      GM_storage.__rt_wrapped_clear = true;
    }

    // Flush queued pushes when back online
    window.addEventListener('online', ()=>{ if(pushQueue.length){ console.log('[RealtimeSync] Online: flushing queue'); pushAll(true); } });

    console.log('[RealtimeSync] Attached listeners');
  }

  if(window.GM_fb?.db){ startRealtime(); }
  else { window.addEventListener('gm:firebase-ready', startRealtime, { once: true }); }
})();
