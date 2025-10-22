(function(){
  let pending = false;
  let refreshTimer = null;
  
  function currentRoute(){ try { return (location.hash || '').replace('#','') || 'products'; } catch { return 'products'; } }
  
  function shouldBlockRefresh(){
    // Chặn refresh nếu có modal đang mở
    const hasModal = document.querySelector('.gm-modal-overlay');
    if (hasModal) return true;
    
    // Chặn nếu có input/textarea/select đang focus (đang điền form)
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
      return true;
    }
    
    // Chặn nếu có contenteditable đang focus
    if (activeEl && activeEl.isContentEditable) {
      return true;
    }
    
    return false;
  }
  
  function reloadNow(){
    pending = false;
    clearTimeout(refreshTimer);
    
    // Kiểm tra lần cuối trước khi reload
    if (shouldBlockRefresh()) {
      console.log('[AutoRefresh] Blocked: form/modal is active');
      // Thử lại sau 3 giây
      refreshTimer = setTimeout(reloadNow, 3000);
      return;
    }
    
    if (window.GM_router && typeof window.GM_router.go === 'function') {
      try { window.GM_router.go(currentRoute()); return; } catch {}
    }
    try { location.reload(); } catch {}
  }
  
  function scheduleReload(){
    if (pending) return;
    pending = true;
    
    // Debounce: đợi 800ms trước khi reload
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      if (document.visibilityState === 'visible') {
        reloadNow();
      } else {
        const onVis = () => { document.removeEventListener('visibilitychange', onVis); setTimeout(reloadNow, 50); };
        document.addEventListener('visibilitychange', onVis);
      }
    }, 800);
  }
  
  window.addEventListener('gm:data-updated', scheduleReload);
  console.log('[AutoRefresh] Ready - will block if form/modal is active');
})();
