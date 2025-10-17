window.GM_router = (function(){
  const routes = {};
  function register(name, renderFn){ routes[name]=renderFn; }
  function go(name){ if(!routes[name]) name='products'; location.hash = name; render(); }
  function current(){ return location.hash.replace('#','') || 'products'; }
  function render(){ 
    const name=current(); 
    console.log('Router rendering page:', name);
    console.log('Available routes:', Object.keys(routes));
    const root=document.getElementById('page-root'); 
    document.getElementById('page-title').textContent=navTitle(name); 
    if(routes[name]) {
      console.log('Found route handler for:', name);
      routes[name](root);
    } else {
      console.warn('No route handler for:', name);
    }
    highlight(name); 
  }
  function navTitle(name){ const map={products:'Sản phẩm',imports:'Nhập kho',exports:'Xuất kho',stock:'Tồn kho',history:'Lịch sử',customers:'Khách hàng',trash:'Thùng rác',settings:'Cài đặt'}; return map[name]||name; }
  function highlight(name){ document.querySelectorAll('#gm-menu button').forEach(b=> b.classList.toggle('active', b.dataset.page===name)); }
  function initMenu(){ const menu=document.getElementById('gm-menu'); menu.innerHTML=''; const items=[['products','📦 Sản phẩm'],['imports','🛬 Nhập kho'],['exports','🛫 Xuất kho'],['stock','📊 Tồn kho'],['customers','👥 Khách hàng'],['history','📜 Lịch sử'],['trash','🗑️ Thùng rác'],['settings','⚙️ Cài đặt']]; items.forEach(([k,l])=>{ const btn=document.createElement('button'); btn.dataset.page=k; btn.textContent=l; btn.onclick=()=> go(k); menu.appendChild(btn); }); }
    async function ensureStorageWidget(){
      const wrap = document.getElementById('storage-widget');
      if(!wrap) return;
      // initial structure if empty
      if(!wrap.dataset.ready){
        wrap.innerHTML = `
          <div class="title">☁️ Bộ nhớ</div>
          <div class="bar"><span id="gm-storage-bar"></span></div>
          <div class="text" id="gm-storage-text">Đang tính toán...</div>
          <button class="buy-btn" id="gm-storage-buy">Mua thêm bộ nhớ</button>
        `;
        wrap.dataset.ready = '1';
        const buy = document.getElementById('gm-storage-buy');
        if (buy) buy.onclick = ()=>{
          // Placeholder: open info modal
          GM_ui.modal(`<div><p>Liên hệ quản trị viên để nâng cấp dung lượng.</p></div>`, { title: 'Mua thêm bộ nhớ' });
        };
      }
      await updateStorageWidget();
      // Listen for storage changes
      window.addEventListener('gm:storage-changed', ()=> updateStorageWidget());
      // Periodic refresh as a fallback (every 15s)
      if (!wrap.dataset.ticker) {
        wrap.dataset.ticker = '1';
        setInterval(updateStorageWidget, 15000);
      }
    }

    async function updateStorageWidget(){
      const bar = document.getElementById('gm-storage-bar');
      const text = document.getElementById('gm-storage-text');
      if(!bar || !text) return;
      try{
        // 1) Always compute our app usage from current state for immediate updates
        const allDataJson = JSON.stringify(GM_storage.exportAll());
        let usageBytes = 0;
        try {
          usageBytes = (window.TextEncoder ? new TextEncoder().encode(allDataJson).length : allDataJson.length);
        } catch { usageBytes = allDataJson.length; }

        // 2) Prefer browser-reported quota; fallback to a sane default
        let quotaBytes = 0;
        if(navigator.storage && navigator.storage.estimate){
          const est = await navigator.storage.estimate();
          quotaBytes = est.quota || 0;
        }
        if(!quotaBytes){
          quotaBytes = 50 * 1024 * 1024; // fallback: 50MB
        }

        // 3) Update UI with fine-grained progress
        const rawPct = quotaBytes > 0 ? (usageBytes / quotaBytes) * 100 : 0;
        const pct = Math.min(100, Math.max(0, rawPct));
        const displayPct = pct > 0 && pct < 0.5 ? 0.5 : pct; // keep a visible thin bar if >0
        bar.style.width = displayPct.toFixed(2) + '%';
        text.textContent = `Đã sử dụng ${GM_utils.formatBytes(usageBytes)} trên tổng ${GM_utils.formatBytes(quotaBytes)}`;
      }catch(e){
        console.warn('Storage estimate failed', e);
        text.textContent = 'Không thể ước tính dung lượng';
      }
    }

  function start(){ initMenu(); ensureStorageWidget(); window.addEventListener('hashchange', render); window.addEventListener('storage', updateStorageWidget); render(); }
  return { register, go, start };
})();