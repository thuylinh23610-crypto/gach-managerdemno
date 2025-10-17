(function(){
  GM_router.register('customers', renderCustomersPage);
  function renderCustomersPage(root){
    root.innerHTML = `<div class='page-head'><h2>👥 Khách hàng</h2><div class='right'><input id='cus-search' placeholder='Tìm...' class='input'></div><button class='btn' id='btn-new-cus'>➕ Thêm</button></div><div id='cus-list'></div>`;
    document.getElementById('btn-new-cus').onclick=()=> openCustomerForm();
    document.getElementById('cus-search').oninput=GM_utils.debounce(e=> refresh(e.target.value.trim()),300);
    refresh('');
  }
  function refresh(q){
    const list = q? GM_customers.search(q): GM_customers.list();
    document.getElementById('cus-list').innerHTML = renderTable(list);
  }
  function renderTable(list){
    if(!list.length) return `<div class='empty'><h3>Chưa có khách hàng</h3></div>`;
  return `<div class='table-wrap'><table class='table'><thead><tr><th>Tên</th><th>SĐT</th><th>Địa chỉ</th><th style='width:160px;text-align:right;'>Thao tác</th></tr></thead><tbody>${list.map(c=>`<tr><td>${c.name}</td><td>${c.phone||''}</td><td>${c.address||''}</td><td style='text-align:right;display:flex;gap:8px;justify-content:flex-end;'><button class='btn ghost' data-id='${c.id}'>Sửa</button><button class='btn danger' data-del='${c.id}'>Xóa</button></td></tr>`).join('')}</tbody></table></div>`;
  }
  function openCustomerForm(cus){
    GM_ui.modal(`<form id='cus-form' class='grid' style='grid-template-columns:1fr 1fr;gap:10px;'>
      <input name='name' placeholder='Tên khách hàng' class='input' value='${cus?cus.name:''}' required />
      <input name='phone' placeholder='SĐT' class='input' value='${cus?cus.phone||'':''}' />
      <input name='address' placeholder='Địa chỉ' class='input' style='grid-column:1/3;' value='${cus?cus.address||'':''}' />
      <div style='grid-column:1/3;text-align:right;display:flex;gap:10px;justify-content:flex-end;'>
        <button type='button' class='btn ghost' onclick='GM_ui.closeModal()'>Hủy</button>
        <button class='btn'>Lưu</button>
      </div>
    </form>`, { title: cus?'Cập nhật khách hàng':'Khách hàng mới' });
    const form=document.getElementById('cus-form');
    form.onsubmit= async (e)=>{
      e.preventDefault();
      const fd=new FormData(form); const data=Object.fromEntries(fd.entries());
      if(cus){ GM_customers.update(cus.id,data); } else { GM_customers.create(data); }
      await GM_stateAPI.persistAll(); GM_ui.toast('Đã lưu'); GM_ui.closeModal(); GM_router.go('customers');
    };
  }
  document.addEventListener('click', e=>{
    if(e.target.matches('#cus-list button[data-id]')){
      const cus = GM_customers.get(e.target.getAttribute('data-id')); openCustomerForm(cus);
    }
    if(e.target.matches('#cus-list button[data-del]')){
      const id = e.target.getAttribute('data-del');
      (async ()=>{
        if(await GM_ui.confirmBox('Bạn có chắc muốn xóa khách hàng này?')){
          const ok = await GM_customers.remove(id);
          if(ok){ GM_ui.toast('Đã xóa khách hàng'); GM_router.go('customers'); }
          else { GM_ui.toast('Không xóa được khách hàng'); }
        }
      })();
    }
  });
})();