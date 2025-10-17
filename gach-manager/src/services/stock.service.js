window.GM_stock = (function(){
  function compute(){
    const map={};
    GM_state.history.forEach(h=>{ if(!map[h.productId]) map[h.productId]=0; if(h.type==='import') map[h.productId]+= h.quantity; else if(h.type==='export') map[h.productId]-= h.quantity; });
    return map; // productId -> qty
  }
  function enriched(){ const qtyMap=compute(); return GM_state.products.filter(p=> !p.deletedAt).map(p=> ({ product:p, quantity: qtyMap[p.id]||0 })); }
  return { compute, enriched };
})();