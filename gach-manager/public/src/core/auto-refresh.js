(function(){
  let pending = false;
  function currentRoute(){ try { return (location.hash || '').replace('#','') || 'products'; } catch { return 'products'; } }
  function reloadNow(){
    pending = false;
    if (window.GM_router && typeof window.GM_router.go === 'function') {
      try { window.GM_router.go(currentRoute()); return; } catch {}
    }
    try { location.reload(); } catch {}
  }
  function scheduleReload(){
    if (pending) return;
    pending = true;
    if (document.visibilityState === 'visible') {
      setTimeout(reloadNow, 120);
    } else {
      const onVis = () => { document.removeEventListener('visibilitychange', onVis); setTimeout(reloadNow, 50); };
      document.addEventListener('visibilitychange', onVis);
    }
  }
  window.addEventListener('gm:data-updated', scheduleReload);
})();
