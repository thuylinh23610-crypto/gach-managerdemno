window.GM_ui = (function(){
  function el(tag, attrs={}, children=[]) {
    const e=document.createElement(tag); Object.entries(attrs).forEach(([k,v])=>{ if(k==='class') e.className=v; else if(k.startsWith('on')&&typeof v==='function') e.addEventListener(k.substring(2),v); else e.setAttribute(k,v); });
    (Array.isArray(children)?children:[children]).forEach(c=>{ if(c==null) return; if(typeof c==='string') e.appendChild(document.createTextNode(c)); else e.appendChild(c); });
    return e;
  }
  function clear(node){ while(node.firstChild) node.removeChild(node.firstChild); }

  function modal(contentHtml, {title='', size='md', style=''}={}){
  // Close any existing modal to avoid stacking
  try { closeModal(); } catch(e){}
  const sizeClass = size === 'xl' ? 'modal-box-xl' : 'modal-box';
  const root=document.getElementById('modal-root');
  // Thêm style trực tiếp vào modal-box/modal-box-xl nếu có
  root.innerHTML = `<div class="modal-overlay"><div class="${sizeClass}" style='${style}'><div style='display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #e5e7eb;flex-shrink:0;'><h3 style='margin:0;font-size:18px;font-weight:600;color:var(--text);'>${title}</h3><button id='gm-close-modal' class='btn ghost' style='padding:6px 12px;font-size:20px;line-height:1;'>×</button></div><div class='modal-content'></div></div></div>`;
  root.querySelector('.modal-content').innerHTML = contentHtml;
  root.querySelector('#gm-close-modal').onclick=()=> closeModal();
  // Close on clicking the overlay
  const overlay = root.querySelector('.modal-overlay');
  if (overlay) overlay.addEventListener('click', (e)=>{ if(e.target===overlay) closeModal(); });
  // Prevent background scroll while modal open
  document.body.style.overflow='hidden';
  }
  function closeModal(){ const r=document.getElementById('modal-root'); r.innerHTML=''; document.body.style.overflow=''; }

  function toast(msg,{type='info',timeout=2200}={}){
    const root=document.getElementById('toast-root');
    const t=document.createElement('div'); t.className='toast'; t.textContent=msg; root.appendChild(t);
    setTimeout(()=> t.remove(), timeout);
  }

  function confirmBox(message){
    return new Promise(res=>{
      modal(`<p style='margin:0 0 18px'>${message}</p><div style='text-align:right;display:flex;gap:8px;justify-content:flex-end'><button class='btn ghost' id='cf-no'>Hủy</button><button class='btn' id='cf-yes'>Đồng ý</button></div>`,{title:'Xác nhận'});
      document.getElementById('cf-no').onclick=()=>{ closeModal(); res(false); };
      document.getElementById('cf-yes').onclick=()=>{ closeModal(); res(true); };
    });
  }

  return { el, clear, modal, closeModal, toast, confirmBox };
})();