window.GM_excel = (function(){
  // Placeholder parse stub (sau sẽ dùng SheetJS nếu cần)
  function parse(text){
    // text CSV kiểu đơn giản -> rows
    const lines=text.split(/\r?\n/).filter(l=>l.trim());
    const headers=lines.shift().split(',').map(h=>h.trim().toLowerCase());
    const rows=lines.map(l=>{ const cells=l.split(','); const obj={}; headers.forEach((h,i)=> obj[h]=cells[i]); return obj; });
    return { headers, rows };
  }
  return { parse };
})();