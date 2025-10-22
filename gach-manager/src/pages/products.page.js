(function(){
  GM_router.register('products', renderProductsPage);
  let editingId = null;
  let currentPage = 1;
  const itemsPerPage = 50;
  
  function renderProductsPage(root){
    const items = GM_products.list();
    root.innerHTML = `
      <div class='page-head'>
        <h2>📦 Sản phẩm (${items.length})</h2>
      </div>
      <div class='card' style='margin-bottom:18px;'>
        <h3 style='margin-top:0;font-size:15px'>${editingId? '✏️ Sửa sản phẩm':'➕ Thêm sản phẩm mới'}</h3>
        <form id='inline-prod-form' class='grid' style='grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;'>
          <input name='code' placeholder='Mã sản phẩm *' class='input' required />
          <input name='size' list='sizes-list' placeholder='Kích thước *' class='input' autocomplete='off' required />
          <input name='material' list='materials-list' placeholder='Chất liệu *' class='input' autocomplete='off' required />
            <datalist id='materials-list'></datalist>
          <input name='surface' list='surfaces-list' placeholder='Bề mặt' class='input' autocomplete='off' />
            <datalist id='surfaces-list'></datalist>
          <input name='factory' list='factories-list' placeholder='Nhà máy' class='input' autocomplete='off' />
            <datalist id='factories-list'></datalist>
          <input name='purchasePrice' type='number' min='0' step='1' placeholder='Giá nhập' class='input' />
          <input name='price' type='number' min='0' step='1' placeholder='Giá bán' class='input' />
          <select name='type' class='input' title='Phân loại sản phẩm'>
            <option value=''>Loại (tùy chọn)</option>
            <option value='Loại 1'>Loại 1</option>
            <option value='Loại 2'>Loại 2</option>
            <option value='Loại 3'>Loại 3</option>
            <option value='Loại 4'>Loại 4</option>
          </select>
          <select name='unit' class='input'>
            <option value=''>Chọn đơn vị tính</option>
            <option value='Thùng'>Thùng</option>
            <option value='m²'>m²</option>
          </select>
          <input name='lotCode' placeholder='Mã lô' class='input' />
          <div style='grid-column:1/-1;display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start;padding:16px;background:#f8fafc;border-radius:8px;'>
            <div style='display:flex;flex-direction:column;gap:8px;'>
              <label style='font-weight:500;color:var(--text);font-size:14px;'>📷 Ảnh sản phẩm</label>
              <input type='file' id='prod-image' accept='image/*' style='max-width:250px' />
              <small style='opacity:.7;font-size:12px;'>Chọn ảnh để hiển thị sản phẩm</small>
            </div>
            <div id='img-preview' style='width:80px;height:80px;border:2px dashed #d1d5db;display:flex;align-items:center;justify-content:center;font-size:11px;color:#777;overflow:hidden;border-radius:8px;background:#f9fafb;'>Ảnh</div>
          </div>
          <div style='grid-column:1/-1;text-align:right;display:flex;gap:10px;justify-content:flex-end;'>
            <button type='button' id='btn-cancel-edit' class='btn ghost' style='display:none'>Hủy</button>
            <button class='btn' id='btn-save-prod'>${editingId? 'Cập nhật':'Lưu sản phẩm'}</button>
            <button class='btn ghost' onclick='openBulkProductImport()'>📂 Tải lên hàng loạt</button>
          </div>
          <datalist id='sizes-list'></datalist>
          <datalist id='surfaces-list'></datalist>
          <datalist id='factories-list'></datalist>
        </form>
      </div>
      <div class='card' style='margin-bottom:12px;'>
        <div style='display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;align-items:end;'>
          <div>
            <label style='display:block;font-size:12px;color:#64748b;margin-bottom:4px;'>Mã sản phẩm</label>
            <input id='prod-filter-code' class='input' placeholder='Lọc mã...'>
          </div>
          <div>
            <label style='display:block;font-size:12px;color:#64748b;margin-bottom:4px;'>Kích thước</label>
            <input id='prod-filter-size' class='input' list='sizes-list' placeholder='Lọc kích thước...'>
          </div>
          <div>
            <label style='display:block;font-size:12px;color:#64748b;margin-bottom:4px;'>Chất liệu</label>
            <input id='prod-filter-material' class='input' list='materials-list' placeholder='Lọc chất liệu...'>
          </div>
          <div>
            <label style='display:block;font-size:12px;color:#64748b;margin-bottom:4px;'>Bề mặt</label>
            <input id='prod-filter-surface' class='input' list='surfaces-list' placeholder='Lọc bề mặt...'>
          </div>
          <div>
            <label style='display:block;font-size:12px;color:#64748b;margin-bottom:4px;'>Loại</label>
            <input id='prod-filter-type' class='input' placeholder='Lọc loại...'>
          </div>
          <div>
            <label style='display:block;font-size:12px;color:#64748b;margin-bottom:4px;'>Nhà máy</label>
            <input id='prod-filter-factory' class='input' list='factories-list' placeholder='Lọc nhà máy...'>
          </div>
          <div>
            <label style='display:block;font-size:12px;color:#64748b;margin-bottom:4px;'>Đơn vị tính</label>
            <input id='prod-filter-unit' class='input' placeholder='Lọc đơn vị...'>
          </div>
        </div>
      </div>
      <div id='prod-table-wrap'>${ renderTable(items, currentPage) }</div>
    `;
    initSuggestionOptions();
    bindFormEvents();
    // Bind filter events
    const filterInputs = ['prod-filter-code','prod-filter-size','prod-filter-material','prod-filter-surface','prod-filter-type','prod-filter-factory','prod-filter-unit'];
    filterInputs.forEach(id=>{
      const el = document.getElementById(id);
      if(el){ el.addEventListener('input', GM_utils.debounce(applyProductFilters, 200)); }
    });
    bindRowEvents();
  }

  function applyProductFilters(){
    const code = (document.getElementById('prod-filter-code')?.value||'').toLowerCase().trim();
    const size = (document.getElementById('prod-filter-size')?.value||'').toLowerCase().trim();
    const material = (document.getElementById('prod-filter-material')?.value||'').toLowerCase().trim();
    const surface = (document.getElementById('prod-filter-surface')?.value||'').toLowerCase().trim();
    const type = (document.getElementById('prod-filter-type')?.value||'').toLowerCase().trim();
    const factory = (document.getElementById('prod-filter-factory')?.value||'').toLowerCase().trim();
    const unit = (document.getElementById('prod-filter-unit')?.value||'').toLowerCase().trim();

    const list = GM_products.list().filter(p=>{
      const v = (s)=> (s||'').toLowerCase();
      if(code && !v(p.code).includes(code)) return false;
      if(size && !v(p.size).includes(size)) return false;
      if(material && !v(p.material).includes(material)) return false;
      if(surface && !v(p.surface).includes(surface)) return false;
      if(type && !v(p.type).includes(type)) return false;
      if(factory && !v(p.factory).includes(factory)) return false;
      if(unit && !v(p.unit).includes(unit)) return false;
      return true;
    });
    currentPage = 1;
    document.getElementById('prod-table-wrap').innerHTML = renderTable(list, currentPage);
    bindRowEvents();
  }
  function renderTable(list, page = 1){
    if(!list.length) return `<div class='empty'><h3>Chưa có sản phẩm</h3><p>Điền form bên trên để thêm sản phẩm đầu tiên.</p></div>`;
    
    // Pagination logic
    const totalPages = Math.ceil(list.length / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedList = list.slice(startIndex, endIndex);
    
    const tableHtml = `<div class='table-wrap'><table class='table'><thead><tr>
      <th style='width:150px;text-align:center;vertical-align:middle;'>HÌNH ẢNH</th>
      <th style='text-align:center;vertical-align:middle;'>MÃ SẢN PHẨM</th>
      <th style='text-align:center;vertical-align:middle;'>KÍCH THƯỚC</th>
      <th style='text-align:center;vertical-align:middle;'>CHẤT LIỆU</th>
      <th style='text-align:center;vertical-align:middle;'>BỀ MẶT</th>
      <th style='text-align:center;vertical-align:middle;'>LOẠI</th>
      <th style='text-align:center;vertical-align:middle;'>NHÀ MÁY</th>
      <th style='text-align:center;vertical-align:middle;'>ĐƠN VỊ TÍNH</th>
      <th style='width:120px;text-align:center;vertical-align:middle;'>Thao tác</th>
    </tr></thead><tbody>
      ${paginatedList.map(p=>`<tr data-id='${p.id}'>
        <td style='padding:4px;text-align:center;vertical-align:middle;'>
          ${p.imageData ? 
            `<img src='${p.imageData}' class='product-thumb' style='width:140px;height:100px;object-fit:contain;object-position:center;background:#fff;border-radius:4px;cursor:pointer;' onmouseover='showImageZoom(this, "${p.imageData}")' onmouseout='hideImageZoom()' />` : 
            `<div style='width:140px;height:100px;background:#f3f4f6;border:1px dashed #d1d5db;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#9ca3af;'>Không có ảnh</div>`
          }
        </td>
  <td style='font-weight:500;text-align:left;vertical-align:middle;'>${p.code||''}</td>
        <td style='text-align:center;vertical-align:middle;'>${p.size||''}</td>
        <td style='text-align:center;vertical-align:middle;'>${p.material||''}</td>
        <td style='text-align:center;vertical-align:middle;'>${p.surface||''}</td>
        <td style='text-align:center;vertical-align:middle;'>${p.type||''}</td>
        <td style='text-align:center;vertical-align:middle;'>${p.factory||''}</td>
        <td style='text-align:center;vertical-align:middle;'>${p.unit||''}</td>
        <td style='text-align:center;vertical-align:middle;'><button class='p-edit btn ghost' style='padding:4px 8px'>Sửa</button> <button class='p-del btn danger' style='padding:4px 8px'>Xóa</button></td>
      </tr>`).join('')}
    </tbody></table></div>`;
    
    // Pagination controls
    const paginationHtml = totalPages > 1 ? `
      <div style='display:flex;justify-content:center;align-items:center;gap:8px;margin-top:16px;'>
        <button class='btn ghost' onclick='changePage(${page - 1})' ${page <= 1 ? 'disabled' : ''}>‹ Trước</button>
        <span style='padding:8px 12px;font-weight:500;'>Trang ${page}/${totalPages} (${list.length} sản phẩm)</span>
        <button class='btn ghost' onclick='changePage(${page + 1})' ${page >= totalPages ? 'disabled' : ''}>Sau ›</button>
      </div>
    ` : '';
    
    return tableHtml + paginationHtml;
  }
  function bindRowEvents(){
    document.querySelectorAll('#prod-table-wrap .p-edit').forEach(btn=> btn.onclick=()=>{
      const id = btn.closest('tr').dataset.id; openEditProductModal(id);
    });
    document.querySelectorAll('#prod-table-wrap .p-del').forEach(btn=> btn.onclick=async ()=>{
      const id = btn.closest('tr').dataset.id; if(await GM_ui.confirmBox('Xóa sản phẩm này?')){ await GM_products.softDelete(id); GM_router.go('products'); GM_ui.toast('Đã xóa'); }
    });
  }

  function bindFormEvents(){
    const form = document.getElementById('inline-prod-form');
    const fileInput = document.getElementById('prod-image');
    const preview = document.getElementById('img-preview');
    const cancelBtn = document.getElementById('btn-cancel-edit');
    
    // Auto-save functionality
    setupProductAutoSave();
    loadSavedProductData();
    
    fileInput.addEventListener('change', ()=>{
      const f=fileInput.files[0];
      if(!f){ preview.innerHTML='Ảnh'; preview.style.backgroundImage=''; return; }
      const reader=new FileReader();
      reader.onload=()=>{ preview.innerHTML=''; preview.style.backgroundSize='contain'; preview.style.backgroundRepeat='no-repeat'; preview.style.backgroundPosition='center'; preview.style.backgroundColor='#fff'; preview.style.backgroundImage=`url(${reader.result})`; preview.dataset.img=reader.result; };
      reader.readAsDataURL(f);
    });
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
  const fd = new FormData(form); const obj = Object.fromEntries(fd.entries());
  obj.price = parseFloat(obj.price)||0; // Giá bán
  obj.purchasePrice = parseFloat(obj.purchasePrice)||0; // Giá nhập
      if(preview.dataset.img) obj.imageData = preview.dataset.img; // base64
      
      // Nếu đang edit, luôn yêu cầu validation
      if(editingId) {
        if(!obj.code){ GM_ui.toast('Mã sản phẩm bắt buộc'); return; }
        if(!obj.size){ GM_ui.toast('Kích thước bắt buộc'); return; }
        if(!obj.material){ GM_ui.toast('Chất liệu bắt buộc'); return; }
        await GM_products.update(editingId, obj); 
        GM_ui.toast('Đã cập nhật');
      } else {
        // Thêm mới: chỉ kiểm tra nếu có dữ liệu
        const hasData = obj.code.trim() || obj.size.trim() || obj.material.trim();
        
        if(hasData) {
          if(!obj.code.trim()){ GM_ui.toast('Mã sản phẩm bắt buộc'); return; }
          if(!obj.size.trim()){ GM_ui.toast('Kích thước bắt buộc'); return; }
          if(!obj.material.trim()){ GM_ui.toast('Chất liệu bắt buộc'); return; }
          await GM_products.create(obj); 
          GM_ui.toast('Đã thêm sản phẩm');
          // Clear saved form data after successful creation
          clearSavedProductData();
        } else {
          GM_ui.toast('Form trống - Vui lòng điền thông tin hoặc import Excel');
          return;
        }
      }
        
      // Reset form sau khi thành công
      form.reset();
      preview.innerHTML = 'Ảnh';
      preview.style.backgroundImage = '';
      delete preview.dataset.img;
      
      editingId=null; 
      GM_router.go('products');
    });
    cancelBtn.onclick=()=>{ editingId=null; GM_router.go('products'); };
  }

  function startEditProduct(id){
    const p = GM_products.get(id); if(!p) return;
    editingId = id; GM_router.go('products'); // re-render page then populate
    setTimeout(()=>{
      const form = document.getElementById('inline-prod-form'); if(!form) return;
  form.code.value = p.code||''; form.size.value=p.size||''; form.material.value=p.material||''; form.surface.value=p.surface||''; form.factory.value=p.factory||''; form.purchasePrice.value=p.purchasePrice||''; form.price.value=p.price||''; form.type.value=p.type||''; form.unit.value=p.unit||''; form.lotCode.value=p.lotCode||'';
      const cancelBtn=document.getElementById('btn-cancel-edit'); if(cancelBtn) cancelBtn.style.display='inline-block';
  if(p.imageData){ const preview=document.getElementById('img-preview'); preview.innerHTML=''; preview.style.backgroundSize='contain'; preview.style.backgroundRepeat='no-repeat'; preview.style.backgroundPosition='center'; preview.style.backgroundColor='#fff'; preview.style.backgroundImage=`url(${p.imageData})`; preview.dataset.img=p.imageData; }
      document.getElementById('btn-save-prod').textContent='Cập nhật';
    },30);
  }

  // New: open modal to edit product nicely
  function openEditProductModal(id){
    const p = GM_products.get(id); if(!p) { GM_ui.toast('Không tìm thấy sản phẩm'); return; }
    const modalHTML = `
      <div style='display:grid;grid-template-columns: 1.4fr .6fr; gap:16px;'>
        <div>
          <div class='grid' style='grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;'>
            <div>
              <label style='font-size:12px;color:#64748b;display:block;margin-bottom:6px;'>Mã sản phẩm *</label>
              <input id='edit-code' class='input' value='${p.code||''}' />
            </div>
            <div>
              <label style='font-size:12px;color:#64748b;display:block;margin-bottom:6px;'>Kích thước *</label>
              <input id='edit-size' class='input' list='sizes-list' value='${p.size||''}' />
            </div>
            <div>
              <label style='font-size:12px;color:#64748b;display:block;margin-bottom:6px;'>Chất liệu *</label>
              <input id='edit-material' class='input' list='materials-list' value='${p.material||''}' />
            </div>
            <div>
              <label style='font-size:12px;color:#64748b;display:block;margin-bottom:6px;'>Bề mặt</label>
              <input id='edit-surface' class='input' list='surfaces-list' value='${p.surface||''}' />
            </div>
            <div>
              <label style='font-size:12px;color:#64748b;display:block;margin-bottom:6px;'>Nhà máy</label>
              <input id='edit-factory' class='input' list='factories-list' value='${p.factory||''}' />
            </div>
            <div>
              <label style='font-size:12px;color:#64748b;display:block;margin-bottom:6px;'>Giá nhập</label>
              <input id='edit-purchase' type='number' min='0' step='1' class='input right' value='${Number(p.purchasePrice)||0}' />
            </div>
            <div>
              <label style='font-size:12px;color:#64748b;display:block;margin-bottom:6px;'>Giá bán</label>
              <input id='edit-price' type='number' min='0' step='1' class='input right' value='${Number(p.price)||0}' />
            </div>
            <div>
              <label style='font-size:12px;color:#64748b;display:block;margin-bottom:6px;'>Đơn vị tính</label>
              <select id='edit-unit' class='input'>
                <option value=''>Chọn đơn vị</option>
                <option value='m²' ${p.unit==='m²'?'selected':''}>m²</option>
                <option value='Thùng' ${p.unit==='Thùng'?'selected':''}>Thùng</option>
              </select>
            </div>
            <div>
              <label style='font-size:12px;color:#64748b;display:block;margin-bottom:6px;'>Mã lô</label>
              <input id='edit-lot' class='input' value='${p.lotCode||''}' />
            </div>
            <div>
              <label style='font-size:12px;color:#64748b;display:block;margin-bottom:6px;'>Loại</label>
              <select id='edit-type' class='input'>
                <option value=''>Loại (tùy chọn)</option>
                <option value='Loại 1' ${p.type==='Loại 1'?'selected':''}>Loại 1</option>
                <option value='Loại 2' ${p.type==='Loại 2'?'selected':''}>Loại 2</option>
                <option value='Loại 3' ${p.type==='Loại 3'?'selected':''}>Loại 3</option>
                <option value='Loại 4' ${p.type==='Loại 4'?'selected':''}>Loại 4</option>
              </select>
            </div>
          </div>
        </div>
        <div>
          <div style='background:#f8fafc;border:1px dashed #d1d5db;border-radius:10px;padding:12px;'>
            <div style='font-size:12px;color:#64748b;margin-bottom:8px;'>📷 Ảnh sản phẩm</div>
            <div id='edit-img-preview' style='width:100%;height:180px;border-radius:8px;background:#fff;border:1px solid #e5e7eb;display:flex;align-items:center;justify-content:center;overflow:hidden;'>
              ${p.imageData? `<img src='${p.imageData}' style='width:100%;height:100%;object-fit:contain;object-position:center;background:#fff;' />` : `<span style='color:#9ca3af;'>Chưa có ảnh</span>`}
            </div>
            <input type='file' id='edit-image-input' accept='image/*' style='margin-top:10px;width:100%;' />
            <small style='display:block;margin-top:6px;color:#6b7280;'>Khuyến nghị ảnh ≤ 1MB (JPEG/WebP)</small>
          </div>
        </div>
      </div>
      <div style='display:flex;gap:10px;justify-content:flex-end;margin-top:14px;'>
        <button class='btn ghost' id='btn-cancel-edit-modal'>Hủy</button>
        <button class='btn' id='btn-save-edit-modal'>Lưu</button>
      </div>
    `;
    GM_ui.modal(modalHTML, { title: `Sửa sản phẩm - ${p.code||''}`, size: 'xl' });

    // Image input handling
    const fileInput = document.getElementById('edit-image-input');
    const imgPreview = document.getElementById('edit-img-preview');
    fileInput.addEventListener('change', ()=>{
      const f=fileInput.files[0];
  if(!f){ imgPreview.innerHTML = p.imageData? `<img src='${p.imageData}' style='width:100%;height:100%;object-fit:contain;object-position:center;background:#fff;' />` : `<span style='color:#9ca3af;'>Chưa có ảnh</span>`; delete imgPreview.dataset.img; return; }
  const reader=new FileReader(); reader.onload=()=>{ imgPreview.innerHTML = `<img src='${reader.result}' style='width:100%;height:100%;object-fit:contain;object-position:center;background:#fff;' />`; imgPreview.dataset.img = reader.result; }; reader.readAsDataURL(f);
    });

    // Buttons
    document.getElementById('btn-cancel-edit-modal').onclick = ()=> GM_ui.closeModal();
    document.getElementById('btn-save-edit-modal').onclick = async ()=>{
      const code = document.getElementById('edit-code').value.trim();
      const size = document.getElementById('edit-size').value.trim();
      const material = document.getElementById('edit-material').value.trim();
      if(!code || !size || !material){ GM_ui.toast('Vui lòng nhập đủ Mã, Kích thước, Chất liệu'); return; }
      const patch = {
        code,
        size,
        material,
        surface: document.getElementById('edit-surface').value.trim(),
        factory: document.getElementById('edit-factory').value.trim(),
        purchasePrice: parseFloat(document.getElementById('edit-purchase').value)||0,
        price: parseFloat(document.getElementById('edit-price').value)||0,
        unit: document.getElementById('edit-unit').value,
        lotCode: document.getElementById('edit-lot').value.trim()
      };
      patch.type = document.getElementById('edit-type').value;
      if(imgPreview.dataset.img) patch.imageData = imgPreview.dataset.img;
      try{
        await GM_products.update(p.id, patch);
        GM_ui.closeModal();
        GM_ui.toast('✅ Đã cập nhật sản phẩm');
        GM_router.go('products');
      }catch(e){
        console.error(e);
        GM_ui.toast('❌ Cập nhật thất bại');
      }
    };
  }

  function initSuggestionOptions(){
    // Updated tile sizes with new additions
    const sizes = ['300x300','400x400','500x500','600x600','800x800','300x600','600x1200','250x400','450x900','150x600','150x800','1000x1000','400x800'];
    // Simplified materials as requested
    const materials = ['Đá','Men','Đá đồng chất'];
    const surfaces = ['Bóng','Mờ Sugar','Nhám','Mờ Matt','Bán bóng','Phủ men'];
    // Extensive list of Vietnamese tile manufacturers
    const factories = [
      'Viglacera','Prime','Đồng Tâm','Catalan','Thạch Bàn','Mỹ Đức','CMC','Hoàn Mỹ','Ý Mỹ',
      'Gạch Đồng Nai','Royal','Ceramic miền Trung','PAK','Top','Tasa','VTHM',
      'Bạch Mã','Mikado','Eurotile','Taicera','Saigon','Hạ Long','Bưu Điện','Thanh Hà',
      'Bình Minh','Thành Thành Công','Tân Á Đại Thành','Asia','Euro','Granite Vilgacera',
      'SCG','Apodio','Saigon Ceramic','Long An','Kito','Đông Á','Đức Thành','Hải Long',
      'Perfect','Caesar','Eurotile','Iris','Rex','Atlas Concorde','Marazzi','Porcelanosa'
    ];
    fillDatalist('sizes-list', sizes);
    fillDatalist('materials-list', materials);
    fillDatalist('surfaces-list', surfaces);
    fillDatalist('factories-list', factories);
  }
  function fillDatalist(id, arr){ const dl=document.getElementById(id); if(!dl) return; dl.innerHTML=arr.map(v=>`<option value='${v}'>`).join(''); }

  // Bulk import products from Excel
  window.openBulkProductImport = function() {
    const modalHTML = `
      <div style="display:flex;flex-direction:column;max-height:70vh;overflow:auto;">
        <div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #e5e7eb;flex-shrink:0;'>
          <h3 style='margin:0;color:var(--text);font-size:22px;font-weight:700;'>📂 Import sản phẩm hàng loạt từ Excel</h3>
        </div>
        <div style='flex:1;overflow-y:auto;padding-right:8px;min-height:0;'>
        <div style='background:#e0f2fe;padding:16px;border-radius:8px;margin-bottom:20px;border-left:4px solid #0ea5e9;'>
          <h4 style='margin:0 0 12px 0;color:#0369a1;display:flex;align-items:center;gap:8px;'>
            📋 Template (9 cột)
            <button class='btn ghost' onclick='downloadProductTemplate()' style='padding:4px 12px;font-size:12px;margin-left:auto;'>📥 Tải template</button>
          </h4>
          <div style='background:white;padding:12px;border-radius:6px;border:1px solid #bae6fd;'>
            <table style='width:100%;border-collapse:collapse;font-size:14px;'>
              <thead>
                <tr style='background:#f0f9ff;'>
                  <th style='border:1px solid #0ea5e9;padding:8px;text-align:center;color:#0369a1;font-weight:600;'>A</th>
                  <th style='border:1px solid #0ea5e9;padding:8px;text-align:center;color:#0369a1;font-weight:600;'>B</th>
                  <th style='border:1px solid #0ea5e9;padding:8px;text-align:center;color:#0369a1;font-weight:600;'>C</th>
                  <th style='border:1px solid #0ea5e9;padding:8px;text-align:center;color:#0369a1;font-weight:600;'>D</th>
                  <th style='border:1px solid #0ea5e9;padding:8px;text-align:center;color:#0369a1;font-weight:600;'>E</th>
                  <th style='border:1px solid #0ea5e9;padding:8px;text-align:center;color:#0369a1;font-weight:600;'>F</th>
                  <th style='border:1px solid #0ea5e9;padding:8px;text-align:center;color:#0369a1;font-weight:600;'>G</th>
                  <th style='border:1px solid #0ea5e9;padding:8px;text-align:center;color:#0369a1;font-weight:600;'>H</th>
                  <th style='border:1px solid #0ea5e9;padding:8px;text-align:center;color:#0369a1;font-weight:600;'>I</th>
                </tr>
              </thead>
              <tbody>
                <tr style='background:#fefefe;'>
                  <td style='border:1px solid #e0e7ff;padding:8px;text-align:center;font-weight:500;'>MÃ SẢN PHẨM</td>
                  <td style='border:1px solid #e0e7ff;padding:8px;text-align:center;font-weight:500;'>HÌNH ẢNH</td>
                  <td style='border:1px solid #e0e7ff;padding:8px;text-align:center;font-weight:500;'>KÍCH THƯỚC</td>
                  <td style='border:1px solid #e0e7ff;padding:8px;text-align:center;font-weight:500;'>CHẤT LIỆU</td>
                  <td style='border:1px solid #e0e7ff;padding:8px;text-align:center;font-weight:500;'>BỀ MẶT</td>
                  <td style='border:1px solid #e0e7ff;padding:8px;text-align:center;font-weight:500;'>LOẠI</td>
                  <td style='border:1px solid #e0e7ff;padding:8px;text-align:center;font-weight:500;'>ĐƠN VỊ TÍNH</td>
                  <td style='border:1px solid #e0e7ff;padding:8px;text-align:center;font-weight:500;'>GIÁ NHẬP</td>
                  <td style='border:1px solid #e0e7ff;padding:8px;text-align:center;font-weight:500;'>GIÁ BÁN</td>
                </tr>
                <tr style='color:#64748b;font-style:italic;'>
                  <td style='border:1px solid #e0e7ff;padding:8px;text-align:center;'>SP001</td>
                  <td style='border:1px solid #e0e7ff;padding:8px;text-align:center;'>URL ảnh (tùy chọn)</td>
                  <td style='border:1px solid #e0e7ff;padding:8px;text-align:center;'>60x60</td>
                  <td style='border:1px solid #e0e7ff;padding:8px;text-align:center;'>Men</td>
                  <td style='border:1px solid #e0e7ff;padding:8px;text-align:center;'>Bóng</td>
                  <td style='border:1px solid #e0e7ff;padding:8px;text-align:center;'>Loại 1</td>
                  <td style='border:1px solid #e0e7ff;padding:8px;text-align:center;'>m²</td>
                  <td style='border:1px solid #e0e7ff;padding:8px;text-align:center;'>120000</td>
                  <td style='border:1px solid #e0e7ff;padding:8px;text-align:center;'>180000</td>
                </tr>
                <tr style='color:#64748b;font-style:italic;'>
                  <td style='border:1px solid #e0e7ff;padding:8px;text-align:center;'>SP002</td>
                  <td style='border:1px solid #e0e7ff;padding:8px;text-align:center;'></td>
                  <td style='border:1px solid #e0e7ff;padding:8px;text-align:center;'>80x80</td>
                  <td style='border:1px solid #e0e7ff;padding:8px;text-align:center;'>Granite</td>
                  <td style='border:1px solid #e0e7ff;padding:8px;text-align:center;'></td>
                  <td style='border:1px solid #e0e7ff;padding:8px;text-align:center;'></td>
                  <td style='border:1px solid #e0e7ff;padding:8px;text-align:center;'>m²</td>
                  <td style='border:1px solid #e0e7ff;padding:8px;text-align:center;'></td>
                  <td style='border:1px solid #e0e7ff;padding:8px;text-align:center;'></td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style='margin:12px 0 0 0;font-size:13px;color:#0369a1;'>
            <strong>✨ Bắt buộc:</strong> Mã SP, Kích thước, Chất liệu | <strong>Tùy chọn:</strong> Hình ảnh (URL hoặc nhúng), Bề mặt, Loại, Đơn vị tính, Giá nhập, Giá bán
          </p>
        </div>
        
        <div style='background:#fef3cd;border:1px solid #f59e0b;border-radius:6px;padding:12px;margin-bottom:20px;'>
          <h4 style='margin:0 0 8px 0;color:#92400e;'>📋 Cột trong file Excel:</h4>
          <ul style='margin:0;padding-left:20px;color:#78716c;font-size:14px;'>
            <li>Cột A: <strong>Mã sản phẩm</strong> (bắt buộc)</li>
            <li>Cột B: <strong>Hình ảnh</strong> (tùy chọn - URL ảnh hoặc ảnh dán trực tiếp trong Excel)</li>
            <li>Cột C: <strong>Kích thước</strong> (bắt buộc)</li>
            <li>Cột D: <strong>Chất liệu</strong> (bắt buộc)</li>
            <li>Cột E: <strong>Bề mặt</strong> (tùy chọn)</li>
            <li>Cột F: <strong>Loại</strong> (tùy chọn)</li>
            <li>Cột G: <strong>Đơn vị tính</strong> (tùy chọn, mặc định m²)</li>
            <li>Cột H: <strong>Giá nhập</strong> (tùy chọn)</li>
            <li>Cột I: <strong>Giá bán</strong> (tùy chọn)</li>
          </ul>
        </div>
        
        <div style='margin-bottom:20px;'>
          <label style='display:block;margin-bottom:8px;font-weight:500;color:var(--text);'>📄 Chọn file Excel:</label>
          <input type='file' id='excel-product-input' accept='.xlsx,.xls' 
                 style='display:block;width:100%;padding:12px;border:2px dashed #d1d5db;border-radius:8px;background:#f9fafb;cursor:pointer;' />
          <div id='product-import-message' style='display:none;margin-top:10px;padding:10px 14px;background:#f1f5f9;border:1.5px solid #cbd5e1;border-radius:8px;color:#334155;font-size:15px;'></div>
        </div>
        
        </div>
        <div style='display:flex;gap:12px;justify-content:flex-end;padding-top:18px;border-top:2px solid #e5e7eb;margin-top:18px;flex-shrink:0;'>
          <button type='button' class='btn ghost' onclick='GM_ui.closeModal()'>❌ Hủy</button>
          <button type='button' class='btn' id='btn-process-bulk-product' onclick='processBulkProductImport()'>📂 Xử lý file</button>
        </div>
      </div>
    `;
    
  GM_ui.modal(modalHTML, { title: 'Import sản phẩm hàng loạt từ Excel', size: 'custom', style: 'width:700px;min-width:600px;max-width:800px;max-height:80vh;' });
  };

  // Download product template
  window.downloadProductTemplate = function() {
    try {
      // Create simple template data
      const templateData = [
        ['MÃ SẢN PHẨM','HÌNH ẢNH','KÍCH THƯỚC','CHẤT LIỆU','BỀ MẶT','LOẠI','ĐƠN VỊ TÍNH','GIÁ NHẬP','GIÁ BÁN'],
        ['SP001','URL ảnh (tùy chọn)','60x60','Men','Bóng','Loại 1','m²','120000','180000'],
        ['SP002','','80x80','Granite','','','m²','',''],
        ['SP003','','30x60','Ceramic','','','m²','','']
      ];
      
      // Load SheetJS if not available
      if (typeof XLSX === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        document.head.appendChild(script);
        
        script.onload = () => {
          downloadExcelTemplate(templateData);
        };
        
        GM_ui.toast('🔄 Đang tải SheetJS... Hãy thử lại sau 2 giây');
        return;
      }
      
      downloadExcelTemplate(templateData);
      
    } catch (error) {
      console.error('Template download error:', error);
      GM_ui.toast('❌ Lỗi tải template');
    }
  };

  function downloadExcelTemplate(templateData) {
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 18 }, // Mã sản phẩm
      { wch: 30 }, // Hình ảnh URL
      { wch: 12 }, // Kích thước
      { wch: 12 }, // Chất liệu
      { wch: 12 }, // Bề mặt
      { wch: 12 }, // Loại
      { wch: 14 }, // Đơn vị tính
      { wch: 12 }, // Giá nhập
      { wch: 12 }  // Giá bán
    ];
    
    // Style header row
    const headerRange = XLSX.utils.decode_range(ws['!ref']);
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddr = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellAddr]) continue;
      ws[cellAddr].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "0ea5e9" } },
        alignment: { horizontal: "center" }
      };
    }
    
    XLSX.utils.book_append_sheet(wb, ws, 'Template Sản Phẩm');
    
    // Download file
    XLSX.writeFile(wb, `Template_San_Pham_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    GM_ui.toast('✅ Đã tải template Excel thành công!');
  }

  // Process bulk product import
  window.processBulkProductImport = async function() {
    const fileInput = document.getElementById('excel-product-input');
    const messageDiv = document.getElementById('product-import-message');
    const processBtn = document.getElementById('btn-process-bulk-product');
    const file = fileInput?.files[0];
    
    if (!file) {
      messageDiv.style.display = 'block';
      messageDiv.style.background = '#fee2e2';
      messageDiv.style.borderColor = '#ef4444';
      messageDiv.style.color = '#991b1b';
      messageDiv.innerText = '⚠️ Vui lòng chọn file Excel';
      return;
    }

    try {
      // Disable button and show processing overlay
      if (processBtn) { processBtn.disabled = true; processBtn.textContent = '🔄 Đang xử lý...'; }
      const processingHTML = `
        <div class="gm-processing-overlay" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;">
          <div style="background:white;padding:20px;border-radius:8px;text-align:center;min-width:320px;">
            <div style="margin-bottom:12px;font-size:16px;color:#111827;">🔄 Đang xử lý file Excel...</div>
            <div class="loading-spinner"></div>
            <div style="margin-top:12px;width:100%;">
              <div style="height:8px;background:#e5e7eb;border-radius:9999px;overflow:hidden;">
                <div id="gm-progress-bar" style="width:0%;height:8px;background:#3b82f6;transition:width .15s;"></div>
              </div>
              <div id="gm-progress-text" style="margin-top:8px;font-size:12px;color:#6b7280;">0/0</div>
            </div>
          </div>
        </div>`;
      document.body.insertAdjacentHTML('beforeend', processingHTML);
      const arrayBuffer = await file.arrayBuffer();

      // Helper: bytes -> base64
      function bytesToBase64(bytes) {
        let binary = '';
        const chunkSize = 0x8000; // 32KB chunks to avoid call stack limits
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, i + chunkSize);
          binary += String.fromCharCode.apply(null, chunk);
        }
        return btoa(binary);
      }

      // Try Method B: use ExcelJS to read cells and embedded images
  async function parseWithExcelJS(ab) {
        // Load ExcelJS dynamically if needed
        if (typeof ExcelJS === 'undefined') {
          await new Promise((resolve) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.3.0/dist/exceljs.min.js';
            s.onload = resolve; document.head.appendChild(s);
          });
        }

        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(ab);
        const ws = wb.worksheets[0];
        if (!ws) throw new Error('Không tìm thấy sheet nào trong file');

        // Build map: rowIndex(1-based) -> dataURL image
        const imageByRow = new Map();
        try {
          if (typeof ws.getImages === 'function') {
            const imgs = ws.getImages();
            imgs.forEach(img => {
              try {
                const tl = (img.range && (img.range.tl || img.range.topLeft || img.range.nativeTL)) || {};
                const rowZero = (typeof tl.row === 'number') ? tl.row : (typeof tl.nativeRow === 'number' ? tl.nativeRow : null);
                if (rowZero == null) return;
                const row = rowZero + 1; // convert 0-based to 1-based Excel row index
                const meta = wb.getImage(img.imageId);
                if (!meta) return;
                const bytes = meta.buffer instanceof Uint8Array ? meta.buffer : new Uint8Array(meta.buffer);
                const b64 = bytesToBase64(bytes);
                const ext = (meta.extension || '').toLowerCase();
                const mime = ext.includes('jpg') || ext.includes('jpeg') ? 'image/jpeg' : 'image/png';
                const dataUrl = `data:${mime};base64,${b64}`;
                // Many images can overlap; keep first one for that row
                if (!imageByRow.has(row)) imageByRow.set(row, dataUrl);
              } catch(e) { console.warn('Read image failed:', e); }
            });
          }
        } catch(e) {
          console.warn('Worksheet.getImages not available or failed:', e);
        }

        const results = [];
        const headerRow = 1;
        const startRow = headerRow + 1;
        const lastRow = ws.rowCount || 10000;
        for (let r = startRow; r <= lastRow; r++) {
          const code = (ws.getCell(r, 1).text || '').trim();
          const size = (ws.getCell(r, 3).text || '').trim();
          const material = (ws.getCell(r, 4).text || '').trim();
          const surface = (ws.getCell(r, 5).text || '').trim();
          const type = (ws.getCell(r, 6).text || '').trim();
          const unit = (ws.getCell(r, 7).text || '').trim() || 'm²';
          const purchasePrice = parseFloat(ws.getCell(r, 8).value) || 0;
          const price = parseFloat(ws.getCell(r, 9).value) || 0;
          const maybeUrl = (ws.getCell(r, 2).text || '').trim();

          // Stop if the entire row is empty (heuristic)
          if (!code && !size && !material && !unit && !maybeUrl) {
            // If many consecutive empty rows, we could break; but keep scanning to be safe
            continue;
          }

          results.push({
            rowNum: r,
            code, size, material, surface, type, unit, purchasePrice, price,
            imageData: imageByRow.get(r) || null,
            imageUrlText: maybeUrl
          });
        }
        return results;
      }

      // Fallback using SheetJS (no embedded image support) if ExcelJS fails
  async function parseWithSheetJS(ab) {
        if (typeof XLSX === 'undefined') {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
          document.head.appendChild(script);
          await new Promise((resolve) => { script.onload = resolve; });
        }
        const data = new Uint8Array(ab);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        const rows = jsonData.slice(1).filter(row => row.length > 0);
        const results = rows.map((row, idx) => ({
          rowNum: idx + 2,
          code: (row[0] ?? '').toString().trim(),
          size: (row[2] ?? '').toString().trim(),
          material: (row[3] ?? '').toString().trim(),
          surface: (row[4] ?? '').toString().trim(),
          type: (row[5] ?? '').toString().trim(),
          unit: ((row[6] ?? 'm²').toString().trim() || 'm²'),
          purchasePrice: parseFloat(row[7]) || 0,
          price: parseFloat(row[8]) || 0,
          imageData: null,
          imageUrlText: ((row[1] ?? '').toString().trim())
        }));
        return results;
      }

      let rows;
      try {
        rows = await parseWithExcelJS(arrayBuffer);
      } catch (e) {
        console.warn('ExcelJS parse failed, fallback to SheetJS:', e);
        rows = await parseWithSheetJS(arrayBuffer);
      }

      if (!rows || rows.length === 0) {
        document.querySelector('.gm-processing-overlay')?.remove();
        messageDiv.style.display = 'block';
        messageDiv.style.background = '#fff7ed';
        messageDiv.style.borderColor = '#f59e0b';
        messageDiv.style.color = '#92400e';
        messageDiv.innerText = '⚠️ Không tìm thấy dữ liệu trong file Excel';
        if (processBtn) { processBtn.disabled = false; processBtn.textContent = '📂 Xử lý file'; }
        return;
      }

      let successCount = 0;
      let errorCount = 0;
      const errors = [];
      const results = [];
      const total = rows.length;
      const bar = document.getElementById('gm-progress-bar');
      const txt = document.getElementById('gm-progress-text');
      if (txt) txt.textContent = `0/${total}`;

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        try {
          const { rowNum, code, size, material } = r;
          const unit = r.unit || 'm²';
          const surface = r.surface || '';
          const type = r.type || '';
          const purchasePrice = r.purchasePrice || 0;
          const price = r.price || 0;
          const factory = '';

          if (!code || !size || !material) {
            errors.push(`Dòng ${rowNum}: Thiếu mã sản phẩm, kích thước hoặc chất liệu`);
            errorCount++;
            results.push({ rowNum, code, size, material, unit, status:'fail', error: 'Thiếu dữ liệu bắt buộc' });
            continue;
          }

          const existingProduct = GM_products.list().find(p => p.code === code);
          if (existingProduct) {
            errors.push(`Dòng ${rowNum}: Sản phẩm ${code} đã tồn tại`);
            errorCount++;
            results.push({ rowNum, code, size, material, unit, status:'fail', error: 'Đã tồn tại' });
            continue;
          }

          const productData = { code, size, material, surface, type, purchasePrice, price, factory, unit };

          if (r.imageData) {
            productData.imageData = r.imageData;
          } else if (r.imageUrlText && /^(http|data:)/i.test(r.imageUrlText)) {
            // Best-effort fetch if URL present in column A
            try {
              const res = await fetch(r.imageUrlText);
              const blob = await res.blob();
              const reader = new FileReader();
              const dataUrl = await new Promise(resolve => { reader.onload = () => resolve(reader.result); reader.readAsDataURL(blob); });
              productData.imageData = dataUrl;
            } catch (e) { console.warn('Image fetch failed for', code, e); }
          }

          await GM_products.create(productData);
          successCount++;
          results.push({ rowNum, code, size, material, unit, status:'success' });
        } catch (error) {
          const rn = r && r.rowNum ? r.rowNum : '?';
          errors.push(`Dòng ${rn}: ${error.message}`);
          errorCount++;
          results.push({ rowNum: rn, code: r?.code || '', size: r?.size || '', material: r?.material || '', unit: r?.unit || 'm²', status:'fail', error: error.message });
        }
        // update progress
        const processed = i + 1;
        if (bar) bar.style.width = `${Math.round(processed/total*100)}%`;
        if (txt) txt.textContent = `${processed}/${total}`;
      }
      // Remove processing overlay before showing toasts/results
      document.querySelector('.gm-processing-overlay')?.remove();

      // Nếu có thành công: đóng modal, thông báo và refresh
      if (successCount > 0) {
        // Clear message div to prevent old content showing
        if (messageDiv) {
          messageDiv.style.display = 'none';
          messageDiv.innerHTML = '';
        }
        // Close modal immediately
        GM_ui.closeModal();
        // Show beautiful success toast
        GM_ui.toast(`✅ Import ${successCount} sản phẩm thành công!`, { type: 'success', timeout: 4000 });
        if (errorCount > 0) GM_ui.toast(`⚠️ Bỏ qua ${errorCount} dòng lỗi`, { type: 'warning', timeout: 4000 });
        // Soft refresh products page
        setTimeout(() => GM_router.go('products'), 300);
        return;
      }

      // Nếu không có dòng thành công: hiển thị chi tiết lỗi trong modal để xem
  const totalCount = results.length;
      const html = `
        <div style='display:flex;flex-direction:column;height:100%;'>
          <div style='background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);color:white;padding:16px;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;'>
            <h4 style='margin:0;font-size:16px;'>📊 Kết quả import sản phẩm</h4>
            <button onclick='GM_ui.closeModal()' class='btn ghost' style='background:rgba(255,255,255,0.2);color:white;border:1px solid rgba(255,255,255,0.3);padding:6px 14px;font-size:14px;font-weight:600;' onmouseover='this.style.background="rgba(255,255,255,0.3)"' onmouseout='this.style.background="rgba(255,255,255,0.2)"'>✖ Đóng</button>
          </div>
          <div style='background:#f8fafc;padding:12px;display:flex;gap:16px;border-bottom:2px solid #e5e7eb;'>
            <div style='flex:1;background:white;padding:12px;border-radius:6px;border-left:4px solid #10b981;'>
              <div style='font-size:24px;font-weight:bold;color:#10b981;'>${successCount}</div>
              <div style='font-size:13px;color:#64748b;margin-top:4px;'>✔ Thành công</div>
            </div>
            <div style='flex:1;background:white;padding:12px;border-radius:6px;border-left:4px solid #ef4444;'>
              <div style='font-size:24px;font-weight:bold;color:#ef4444;'>${errorCount}</div>
              <div style='font-size:13px;color:#64748b;margin-top:4px;'>✖ Thất bại</div>
            </div>
            <div style='flex:1;background:white;padding:12px;border-radius:6px;border-left:4px solid #3b82f6;'>
              <div style='font-size:24px;font-weight:bold;color:#3b82f6;'>${totalCount}</div>
              <div style='font-size:13px;color:#64748b;margin-top:4px;'>📋 Tổng số</div>
            </div>
          </div>
          <div style='flex:1;overflow-y:auto;background:white;border:1px solid #e5e7eb;border-top:none;'>
            <table style='width:100%;border-collapse:collapse;font-size:14px;table-layout:fixed;'>
              <thead style='position:sticky;top:0;background:#f9fafb;z-index:1;'>
                <tr>
                  <th style='padding:10px 12px;border-bottom:2px solid #e5e7eb;text-align:center;font-size:13px;color:#64748b;font-weight:600;width:60px;'>STT</th>
                  <th style='padding:10px 12px;border-bottom:2px solid #e5e7eb;text-align:left;font-size:13px;color:#64748b;font-weight:600;width:20%;'>Mã SP</th>
                  <th style='padding:10px 12px;border-bottom:2px solid #e5e7eb;text-align:left;font-size:13px;color:#64748b;font-weight:600;width:20%;'>Kích thước</th>
                  <th style='padding:10px 12px;border-bottom:2px solid #e5e7eb;text-align:left;font-size:13px;color:#64748b;font-weight:600;width:20%;'>Chất liệu</th>
                  <th style='padding:10px 12px;border-bottom:2px solid #e5e7eb;text-align:center;font-size:13px;color:#64748b;font-weight:600;width:15%;'>Đơn vị</th>
                  <th style='padding:10px 12px;border-bottom:2px solid #e5e7eb;text-align:center;font-size:13px;color:#64748b;font-weight:600;width:15%;'>Kết quả</th>
                </tr>
              </thead>
              <tbody>
                ${results.map((r, idx) => {
                  const bg = idx % 2 === 0 ? 'white' : '#f9fafb';
                  const statusBadge = r.status === 'success'
                    ? '<span style="background:#d1fae5;color:#065f46;padding:4px 10px;border-radius:12px;font-size:12px;font-weight:600;">✔ Thành công</span>'
                    : `<span style="background:#fee2e2;color:#991b1b;padding:4px 10px;border-radius:12px;font-size:12px;font-weight:600;" title="${(r.error||'')}">✖ Thất bại</span>`;
                  return `
                    <tr style='background:${bg};'>
                      <td style='padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#94a3b8;font-weight:600;text-align:center;'>${idx+1}</td>
                      <td style='padding:10px 12px;border-bottom:1px solid #f1f5f9;'>${r.code||''}</td>
                      <td style='padding:10px 12px;border-bottom:1px solid #f1f5f9;'>${r.size||''}</td>
                      <td style='padding:10px 12px;border-bottom:1px solid #f1f5f9;'>${r.material||''}</td>
                      <td style='padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center;'>${r.unit||''}</td>
                      <td style='padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center;'>${statusBadge}</td>
                    </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
          <div style='background:#f8fafc;padding:14px 16px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;'>
            <p style='margin:0;font-size:13px;color:#64748b;'>
              💡 ${successCount > 0 ? '<strong style="color:#10b981;">Import thành công!</strong> Trang sẽ tự động tải lại...' : '<strong style="color:#ef4444;">Có lỗi xảy ra.</strong> Vui lòng kiểm tra lại dữ liệu.'}
            </p>
            <button onclick='GM_ui.closeModal()' class='btn ghost' style='padding:8px 16px;font-size:13px;'>✖ Đóng</button>
          </div>
        </div>
      `;
      messageDiv.innerHTML = html;
      messageDiv.style.display = 'block';

      // Re-enable button text (staying on modal due to all errors)
      if (processBtn) { processBtn.disabled = false; processBtn.textContent = '📂 Xử lý file'; }

    } catch (error) {
      console.error('Bulk import error:', error);
      document.querySelector('.gm-processing-overlay')?.remove();
      messageDiv.style.display = 'block';
      messageDiv.style.background = '#fee2e2';
      messageDiv.style.borderColor = '#ef4444';
      messageDiv.style.color = '#991b1b';
      messageDiv.innerText = '❌ Lỗi xử lý file Excel: ' + error.message;
      if (processBtn) { processBtn.disabled = false; processBtn.textContent = '📂 Xử lý file'; }
    }
  };

  // Global functions for pagination and image zoom
  window.changePage = function(newPage) {
    const searchQuery = document.getElementById('prod-search').value.trim();
    const items = searchQuery ? GM_products.search(searchQuery) : GM_products.list();
    const totalPages = Math.ceil(items.length / itemsPerPage);
    
    if(newPage < 1 || newPage > totalPages) return;
    currentPage = newPage;
    document.getElementById('prod-table-wrap').innerHTML = renderTable(items, currentPage);
    bindRowEvents();
  };

  window.showImageZoom = function(img, imageSrc) {
    let zoomDiv = document.getElementById('image-zoom');
    if(!zoomDiv) {
      zoomDiv = document.createElement('div');
      zoomDiv.id = 'image-zoom';
      zoomDiv.style.cssText = `
        position: fixed;
        z-index: 9999;
        pointer-events: none;
        border-radius: 8px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        border: 2px solid white;
        transition: all 0.2s ease;
        transform: scale(0);
      `;
      document.body.appendChild(zoomDiv);
    }
    
    zoomDiv.innerHTML = `<img src="${imageSrc}" style="width:450px;height:450px;object-fit:cover;border-radius:6px;" />`;
    zoomDiv.style.display = 'block';
    
    // Position near cursor but keep within viewport
    const rect = img.getBoundingClientRect();
    const zoomSize = 450;
    let left = rect.right + 10;
    let top = rect.top;
    
    // Adjust if would go off screen
    if(left + zoomSize > window.innerWidth) left = rect.left - zoomSize - 10;
    if(top + zoomSize > window.innerHeight) top = window.innerHeight - zoomSize - 10;
    if(top < 0) top = 10;
    
    zoomDiv.style.left = left + 'px';
    zoomDiv.style.top = top + 'px';
    
    // Animate in
    setTimeout(() => zoomDiv.style.transform = 'scale(1)', 10);
  };

  window.hideImageZoom = function() {
    const zoomDiv = document.getElementById('image-zoom');
    if(zoomDiv) {
      zoomDiv.style.transform = 'scale(0)';
      setTimeout(() => zoomDiv.style.display = 'none', 200);
    }
  };
  
  // Auto-save functionality for products
  function setupProductAutoSave() {
    const fieldsToSave = ['prod-code', 'prod-size', 'prod-material', 'prod-surface', 'prod-factory', 'prod-price', 'prod-unit'];
    
    fieldsToSave.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.addEventListener('input', saveProductFormData);
        field.addEventListener('change', saveProductFormData);
      }
    });
  }
  
  function saveProductFormData() {
    // Don't save when editing existing product
    if (editingId) return;
    
    const formData = {
      code: document.getElementById('prod-code')?.value || '',
      size: document.getElementById('prod-size')?.value || '',
      material: document.getElementById('prod-material')?.value || '',
      surface: document.getElementById('prod-surface')?.value || '',
      factory: document.getElementById('prod-factory')?.value || '',
      price: document.getElementById('prod-price')?.value || '',
      unit: document.getElementById('prod-unit')?.value || '',
      timestamp: Date.now()
    };
    
    // Only save if at least one field has data
    const hasData = Object.values(formData).some(value => value && value !== '');
    if (hasData) {
      localStorage.setItem('product_form_data', JSON.stringify(formData));
    }
  }
  
  function loadSavedProductData() {
    // Don't load saved data if editing existing product
    if (editingId) return;
    
    try {
      const savedFormData = localStorage.getItem('product_form_data');
      const restoredThisSession = sessionStorage.getItem('product_restored');
      
      if (savedFormData) {
        const formData = JSON.parse(savedFormData);
        const timeDiff = Date.now() - (formData.timestamp || 0);
        
        // Only restore if data is less than 1 hour old
        if (timeDiff < 3600000) {
          document.getElementById('prod-code').value = formData.code || '';
          document.getElementById('prod-size').value = formData.size || '';
          document.getElementById('prod-material').value = formData.material || '';
          document.getElementById('prod-surface').value = formData.surface || '';
          document.getElementById('prod-factory').value = formData.factory || '';
          document.getElementById('prod-price').value = formData.price || '';
          document.getElementById('prod-unit').value = formData.unit || '';
          
          // Toast ONLY once per session
          if (!restoredThisSession && (formData.code || formData.size)) {
            GM_ui.toast('📋 Đã khôi phục thông tin sản phẩm đang nhập');
            sessionStorage.setItem('product_restored', 'true');
          }
        }
      }
    } catch (error) {
      console.error('Error loading saved product data:', error);
    }
  }
  
  function clearSavedProductData() {
    localStorage.removeItem('product_form_data');
  }
})();