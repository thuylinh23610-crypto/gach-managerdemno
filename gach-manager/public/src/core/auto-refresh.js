(function(){
  // AUTO-REFRESH DISABLED per user request
  // User prefers manual refresh only, no automatic page reloads
  console.log('[AutoRefresh] Disabled - no automatic refresh will occur');
  
  // Listen to data-updated events but DO NOT reload
  window.addEventListener('gm:data-updated', (e) => {
    console.log('[AutoRefresh] Data updated (version ' + (e.detail?.version || '?') + ') - manual refresh needed');
  });
})();
