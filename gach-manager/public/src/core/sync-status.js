(function(){
  // Ensure DOM available
  function ready(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  // State
  const state = {
    pending: 0,
    online: navigator.onLine,
    lastChangeAt: Date.now()
  };

  // Create chip UI
  function ensureChip(){
    let chip = document.getElementById('gm-sync-chip');
    if (chip) return chip;
    const container = document.querySelector('.topbar .actions') || document.querySelector('.topbar') || document.body;
    chip = document.createElement('div');
    chip.id = 'gm-sync-chip';
    chip.setAttribute('aria-live','polite');
    chip.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600;border:1px solid var(--border);background:#f8fafc;color:#374151;';
    const dot = document.createElement('span');
    dot.id = 'gm-sync-dot';
    dot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:#9ca3af;display:inline-block;';
    const text = document.createElement('span');
    text.id = 'gm-sync-text';
    text.textContent = 'Đang kiểm tra...';
    chip.appendChild(dot); chip.appendChild(text);
    if (container) container.prepend(chip); else document.body.appendChild(chip);
    return chip;
  }

  function setChip(status){
    const chip = ensureChip();
    const dot = chip.querySelector('#gm-sync-dot');
    const text = chip.querySelector('#gm-sync-text');
    if (!dot || !text) return;
    switch(status){
      case 'offline':
        chip.style.background = '#fff1f2';
        chip.style.borderColor = '#fecdd3';
        text.style.color = '#9f1239';
        dot.style.background = '#e11d48';
        text.textContent = 'Offline';
        break;
      case 'syncing':
        chip.style.background = '#eff6ff';
        chip.style.borderColor = '#bfdbfe';
        text.style.color = '#1d4ed8';
        dot.style.background = '#3b82f6';
        text.textContent = 'Đang đồng bộ...';
        break;
      default:
        chip.style.background = '#ecfdf5';
        chip.style.borderColor = '#bbf7d0';
        text.style.color = '#065f46';
        dot.style.background = '#10b981';
        text.textContent = 'Online';
    }
  }

  function recompute(){
    // Priority: offline > syncing > online
    if (!state.online) return setChip('offline');
    if (state.pending > 0) return setChip('syncing');
    return setChip('online');
  }

  // Public helpers to mark pending writes
  window.GM_syncStatus = {
    inc(){ state.pending = Math.max(0, state.pending + 1); state.lastChangeAt = Date.now(); recompute(); },
    dec(){ state.pending = Math.max(0, state.pending - 1); state.lastChangeAt = Date.now(); recompute(); },
    setOnline(v){ state.online = !!v; state.lastChangeAt = Date.now(); recompute(); }
  };

  // Patch Firestore write functions to track in-flight operations
  function patchFirestore(){
    const FB = window.FB; if (!FB) return;
    const toWrap = ['addDoc','setDoc','updateDoc','deleteDoc'];
    toWrap.forEach(name => {
      const orig = FB[name];
      if (typeof orig !== 'function') return;
      FB[name] = async function(){
        try { window.GM_syncStatus.inc(); return await orig.apply(FB, arguments); }
        finally { window.GM_syncStatus.dec(); }
      };
    });
  }

  // Events
  window.addEventListener('online', ()=> window.GM_syncStatus.setOnline(true));
  window.addEventListener('offline', ()=> window.GM_syncStatus.setOnline(false));

  // Init after DOM + Firebase available
  ready(function(){ ensureChip(); recompute(); patchFirestore(); });
  // If Firebase loads later (module), retry a couple times
  let tries = 0; const t = setInterval(()=>{ if (window.FB || tries++ > 10){ clearInterval(t); patchFirestore(); } }, 500);
})();
