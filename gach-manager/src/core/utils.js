window.GM_utils = (function(){
  function formatMoney(n){ n = Number(n)||0; return n.toLocaleString('vi-VN'); }
  function formatDate(d){ if(!d) return ''; d = new Date(d); if(isNaN(d)) return ''; return d.toLocaleDateString('vi-VN'); }
  function nowISO(){ return new Date().toISOString(); }
  function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
  function sum(arr, fn){ return arr.reduce((a,b)=> a + (fn?fn(b):b), 0); }
  function debounce(fn,ms){ let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args),ms); }; }
  function formatBytes(bytes){
    bytes = Number(bytes)||0; const units=['B','KB','MB','GB','TB'];
    let i=0; let v=bytes; while(v>=1024 && i<units.length-1){ v/=1024; i++; }
    // keep 2 decimals for MB+; 0 for KB/B
    const fixed = i>=2 ? 2 : 0; // from MB
    return `${v.toFixed(fixed)} ${units[i]}`;
  }
  // Convert quantity between pieces, boxes, m2 using product info
  function convertQuantity(product, {pieces, boxes, m2}){
    const ppb = parseFloat(product?.piecesPerBox)||0;
    const m2pb = parseFloat(product?.m2PerBox)||0;
    if(pieces!=null){
      const res = { pieces };
      if(ppb) res.boxes = pieces/ppb; if(ppb && m2pb) res.m2 = (pieces/ppb)*m2pb; return res;
    }
    if(boxes!=null){
      const res = { boxes };
      if(ppb) res.pieces = boxes*ppb; if(m2pb) res.m2 = boxes*m2pb; return res;
    }
    if(m2!=null){
      const res = { m2 };
      if(m2pb) res.boxes = m2/m2pb; if(m2pb && ppb) res.pieces = res.boxes*ppb; return res;
    }
    return { pieces:0 };
  }
  return { formatMoney, formatDate, nowISO, uid, sum, debounce, convertQuantity, formatBytes };
})();