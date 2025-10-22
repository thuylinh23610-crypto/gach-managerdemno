(function(){
  GM_router.register('stock', renderStockPage);
  function round2(n){ const v=parseFloat(n); if(isNaN(v)) return 0; return Math.round((v+Number.EPSILON)*100)/100; }
  function formatQty(n){ const v=round2(n); return v.toLocaleString('vi-VN',{minimumFractionDigits:0,maximumFractionDigits:2}); }
  
  function renderStockPage(root){
    const stockData = calculateAllStock();
    const products = GM_products.list();
    // Tính giá nhập/bán gần nhất theo chứng từ
    const { lastImportPrice, lastExportPrice } = computeLastPrices();
    const stockItems = products.map(product => {
      const key = product.code || product.id;
      const stock = stockData[key] || 0;
      // fallback: use product.purchasePrice and product.price when receipts not present
      const giaNhap = (lastImportPrice.get(key) ?? product.purchasePrice ?? 0) || 0;
      const giaBan = (lastExportPrice.get(key) ?? product.price ?? 0) || 0;
      return {
        ...product,
        stock,
        giaNhap,
        giaBan,
        thanhTienNhap: (Number(stock)||0) * (Number(giaNhap)||0),
        thanhTienBan: (Number(stock)||0) * (Number(giaBan)||0)
      };
    });
    
    root.innerHTML = `
      <div class='page-head'>
        <h2>📦 Tồn kho</h2>
      </div>
      
      <div class='card'>
        <div style='display:flex;justify-content:space-between;align-items:center;gap:12px;'>
          <h3 style='margin:0;font-size:18px;color:var(--text);'>📋 Danh sách tồn kho</h3>
          <div style='display:flex;gap:8px;flex-wrap:wrap'>
            <button class='btn' onclick='downloadStockExcel()'>📥 Tải tồn kho</button>
            <button class='btn' onclick='try{GM_exportAndClear&&GM_exportAndClear()}catch(e){console.error(e);GM_ui.toast("Không tìm thấy chức năng xuất & xóa")}' title='Xuất JSON toàn bộ dữ liệu rồi xóa tất cả'>⬇️ Xuất JSON và XÓA</button>
          </div>
        </div>
        
        <!-- Filter bar -->
        <div style='margin:16px 0;'>
          <div style='display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;'>
            <input id='stock-filter-code' class='input' placeholder='Mã sản phẩm...'/>
            <input id='stock-filter-size' class='input' placeholder='Kích thước...'/>
            <input id='stock-filter-material' class='input' placeholder='Chất liệu...'/>
            <input id='stock-filter-surface' class='input' placeholder='Bề mặt...'/>
            <input id='stock-filter-unit' class='input' placeholder='Đơn vị...'/>
          </div>
        </div>
        
        ${renderStockTable(stockItems)}
      </div>
    `;
    
    bindStockEvents();
    ['stock-filter-code','stock-filter-size','stock-filter-material','stock-filter-surface','stock-filter-unit']
      .forEach(id=>{ const el=document.getElementById(id); if(el) el.addEventListener('input', GM_utils.debounce(()=>applyStockFilters(stockItems), 200)); });
  }
  
  function calculateAllStock() {
    const imports = GM_receipts.list('import') || [];
    const exports = GM_receipts.list('export') || [];
    const products = GM_products.list() || [];
    const stockData = {};

    // Build quick lookup maps for robust matching
    const byId = Object.create(null);
    const byCode = Object.create(null);
    products.forEach(p => { if(!p) return; byId[p.id] = p; const c = p.code || p.id; if(c) byCode[c] = p; });

    // Initialize stock for all products
    products.forEach(product => {
      const productCode = product.code || product.id;
      stockData[productCode] = 0;
    });

    const addItem = (item, sign) => {
      if (!item) return;
      const qty = parseFloat(item.quantity) || 0;
      if (!qty && qty !== 0) return;
      // Match by id first, then by code fallback (legacy data may store code in productId)
      const p = byId[item.productId] || byCode[item.productId];
      if (!p) return;
      const code = p.code || p.id;
      stockData[code] = (stockData[code] || 0) + sign * qty;
    };

    // Sum imports
    imports.forEach(receipt => { (receipt.items || []).forEach(it => addItem(it, +1)); });
    // Subtract exports
    exports.forEach(receipt => { (receipt.items || []).forEach(it => addItem(it, -1)); });

    return stockData;
  }
  
  function renderStockTable(stockItems) {
    if (!stockItems.length) {
      return `
        <div class='empty' style='padding:40px;text-align:center;'>
          <h3 style='color:var(--muted);'>📦 Chưa có sản phẩm nào</h3>
          <p style='color:var(--muted);'>Thêm sản phẩm từ trang Sản phẩm để xem tồn kho</p>
        </div>
      `;
    }
    // Totals
    const totals = stockItems.reduce((acc, it)=>{
      acc.qty += Number(it.stock)||0;
      acc.nhap += Number(it.thanhTienNhap)||0;
      acc.ban += Number(it.thanhTienBan)||0;
      return acc;
    }, { qty:0, nhap:0, ban:0 });

    return `
      <div class='table-wrap' style='margin-top:16px;'>
        <table class='table'>
          <thead>
            <tr style='background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);color:white;'>
              <th style='padding:16px 12px;font-weight:600;text-align:center;vertical-align:middle;border:none;'>MÃ SẢN PHẨM</th>
              <th style='padding:16px 12px;font-weight:600;text-align:center;vertical-align:middle;border:none;width:150px;'>HÌNH ẢNH</th>
              <th style='padding:16px 12px;font-weight:600;text-align:center;vertical-align:middle;border:none;'>KÍCH THƯỚC</th>
              <th style='padding:16px 12px;font-weight:600;text-align:center;vertical-align:middle;border:none;'>CHẤT LIỆU</th>
              <th style='padding:16px 12px;font-weight:600;text-align:center;vertical-align:middle;border:none;'>BỀ MẶT</th>
              <th style='padding:16px 12px;font-weight:600;text-align:center;vertical-align:middle;border:none;'>ĐƠN VỊ TÍNH</th>
              <th style='padding:16px 12px;font-weight:600;text-align:center;vertical-align:middle;border:none;width:120px;'>SỐ LƯỢNG</th>
              <th style='padding:16px 12px;font-weight:600;text-align:center;vertical-align:middle;border:none;width:120px;'>GIÁ NHẬP</th>
              <th style='padding:16px 12px;font-weight:600;text-align:center;vertical-align:middle;border:none;width:140px;'>THÀNH TIỀN NHẬP</th>
              <th style='padding:16px 12px;font-weight:600;text-align:center;vertical-align:middle;border:none;width:120px;'>GIÁ BÁN</th>
              <th style='padding:16px 12px;font-weight:600;text-align:center;vertical-align:middle;border:none;width:140px;'>THÀNH TIỀN BÁN</th>
            </tr>
          </thead>
          <tbody id='stock-tbody'>
            ${stockItems.map((item, index) => {
              const isLowStock = item.stock <= 0;
              const isNegative = item.stock < 0;
              const stockClass = isNegative ? 'negative-stock' : (isLowStock ? 'low-stock' : 'good-stock');
              const stockIcon = isNegative ? '⚠️' : (isLowStock ? '📉' : '📈');
              
              return `
                <tr class='stock-row ${stockClass}' style='transition:all 0.3s ease;${index % 2 === 0 ? 'background:#f8fafc;' : ''}'>
                  <td style='padding:12px;font-weight:600;text-align:left;vertical-align:middle;'>
                    <a href="#" onclick="GM_router.navigate('products');return false;" style='color:#2563eb;text-decoration:none;'>${item.code || item.id}</a>
                  </td>
                  <td style='padding:8px;text-align:center;vertical-align:middle;'>
                    ${item.imageData ? 
                      `<img src='${item.imageData}' style='width:80px;height:60px;object-fit:cover;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);cursor:pointer;' onclick='showStockImageZoom("${item.imageData}")' />` : 
                      `<div style='width:80px;height:60px;background:linear-gradient(135deg, #f3f4f6, #e5e7eb);border:2px dashed #d1d5db;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#9ca3af;'>Không có ảnh</div>`
                    }
                  </td>
                  <td style='padding:12px;text-align:center;vertical-align:middle;'>${item.size || '-'}</td>
                  <td style='padding:12px;text-align:center;vertical-align:middle;'>${item.material || '-'}</td>
                  <td style='padding:12px;text-align:center;vertical-align:middle;'>${item.surface || '-'}</td>
                  <td style='padding:12px;text-align:center;vertical-align:middle;'>${formatUnit(item.unit)}</td>
                  <td style='padding:12px;text-align:right;font-weight:700;font-size:16px;vertical-align:middle;'>
                    ${formatQty(item.stock)}
                  </td>
                  <td style='padding:12px;text-align:right;vertical-align:middle;color:#2563eb;'>${(Number(item.giaNhap)||0).toLocaleString('vi-VN')}</td>
                  <td style='padding:12px;text-align:right;vertical-align:middle;color:#2563eb;'>${(Number(item.thanhTienNhap)||0).toLocaleString('vi-VN')}</td>
                  <td style='padding:12px;text-align:right;vertical-align:middle;'>${(Number(item.giaBan)||0).toLocaleString('vi-VN')}</td>
                  <td style='padding:12px;text-align:right;vertical-align:middle;color:#ef4444;font-weight:600;'>${(Number(item.thanhTienBan)||0).toLocaleString('vi-VN')}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style='background:#f3f4f6;'>
              <td colspan='6' style='padding:12px;text-align:right;font-weight:700;'>TỔNG</td>
              <td style='padding:12px;text-align:right;font-weight:700;'>${formatQty(totals.qty)}</td>
              <td></td>
              <td style='padding:12px;text-align:right;font-weight:700;color:#2563eb;'>${totals.nhap.toLocaleString('vi-VN')}</td>
              <td></td>
              <td style='padding:12px;text-align:right;font-weight:700;color:#ef4444;'>${totals.ban.toLocaleString('vi-VN')}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      <style>
        .stock-badge.good-stock {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
        }
        .stock-badge.low-stock {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
          box-shadow: 0 2px 4px rgba(245, 158, 11, 0.3);
        }
        .stock-badge.negative-stock {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
          animation: pulse 2s infinite;
        }
        
        .stock-row:hover {
          background: rgba(102, 126, 234, 0.05) !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        
        .table th {
          position: sticky;
          top: 0;
          z-index: 10;
        }
      </style>
    `;
  }

  // Tính giá nhập/bán gần nhất dựa trên chứng từ (import/export)
  function computeLastPrices(){
    const imports = GM_receipts.list('import') || [];
    const exports = GM_receipts.list('export') || [];
    const lastImportPrice = new Map();
    const lastExportPrice = new Map();

    const trySet = (map, key, price, dateStr) => {
      const cur = map.get(key);
      const curDate = cur?.date ? Date.parse(cur.date) : -Infinity;
      const d = Date.parse(dateStr || '') || 0;
      if (!cur || d >= curDate) map.set(key, { price: Number(price)||0, date: dateStr||'' });
    };

    imports.forEach(rec => {
      const date = rec?.date || '';
      (rec.items||[]).forEach(it => {
        const key = findProductKey(it.productId);
        if (!key) return;
        trySet(lastImportPrice, key, it.price, date);
      });
    });

    exports.forEach(rec => {
      const date = rec?.date || '';
      (rec.items||[]).forEach(it => {
        const key = findProductKey(it.productId);
        if (!key) return;
        trySet(lastExportPrice, key, it.price, date);
      });
    });

    // Flatten to value maps
    const mapIn = new Map();
    lastImportPrice.forEach((v,k)=> mapIn.set(k, v.price));
    const mapOut = new Map();
    lastExportPrice.forEach((v,k)=> mapOut.set(k, v.price));
    return { lastImportPrice: mapIn, lastExportPrice: mapOut };
  }

  // Tìm key sản phẩm (ưu tiên code) từ productId lưu trong item
  function findProductKey(productId){
    if(!productId) return null;
    const p = (GM_state.products||[]).find(x => x.id === productId || x.code === productId);
    if(!p) return null;
    return p.code || p.id;
  }
  
  function bindStockEvents() {
    const searchInput = document.getElementById('stock-search');
    if (searchInput) {
      searchInput.addEventListener('input', GM_utils.debounce((e) => {
        const query = e.target.value.trim().toLowerCase();
        filterStockTable(query);
      }, 300));
    }
  }
  
  function filterStockTable(query) {
    const rows = document.querySelectorAll('#stock-tbody .stock-row');
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      if (text.includes(query)) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  }

  function applyStockFilters(original){
    const code=(document.getElementById('stock-filter-code')?.value||'').toLowerCase().trim();
    const size=(document.getElementById('stock-filter-size')?.value||'').toLowerCase().trim();
    const material=(document.getElementById('stock-filter-material')?.value||'').toLowerCase().trim();
    const surface=(document.getElementById('stock-filter-surface')?.value||'').toLowerCase().trim();
    const unit=(document.getElementById('stock-filter-unit')?.value||'').toLowerCase().trim();

    const list = original.filter(p=>{
      const v=s=> (s||'').toLowerCase();
      if(code && !v(p.code).includes(code)) return false;
      if(size && !v(p.size).includes(size)) return false;
      if(material && !v(p.material).includes(material)) return false;
      if(surface && !v(p.surface).includes(surface)) return false;
      if(unit && !v(p.unit).includes(unit)) return false;
      return true;
    });
    // Re-render only the table to preserve other event listeners
    const container = document.querySelector('.card');
    const tableWrap = container ? container.querySelector('.table-wrap') : null;
    if(tableWrap && container){
      const wrapper = document.createElement('div');
      wrapper.innerHTML = renderStockTable(list);
      const newTableWrap = wrapper.querySelector('.table-wrap');
      // Replace the existing table-wrap
      tableWrap.replaceWith(newTableWrap);
    }
  }

  // Helper: render unit like 'VNĐ/<unit>' if not already contains currency
  function formatUnit(unit){
    const u = (unit||'').trim();
    if(!u) return '-';
    const hasVND = /vnd|vnđ|đ/gi.test(u);
    return hasVND ? u : `VNĐ/${u}`;
  }

  // Export stock to Excel with headers: HÌNH ẢNH, MÃ SẢN PHẨM, KÍCH THƯỚC, CHẤT LIỆU, ĐƠN VỊ TÍNH, Số lượng
  window.downloadStockExcel = async function() {
    try {
      // Load ExcelJS dynamically if needed
      if (typeof ExcelJS === 'undefined') {
        await new Promise((resolve) => {
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.3.0/dist/exceljs.min.js';
          s.onload = resolve; document.head.appendChild(s);
        });
      }

      const stockData = calculateAllStock();
      const products = GM_products.list();

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Ton_kho');

      // Headers
      const headers = ['HÌNH ẢNH','MÃ SẢN PHẨM','KÍCH THƯỚC','CHẤT LIỆU','ĐƠN VỊ TÍNH','Số lượng'];
      ws.addRow(headers);
      ws.getRow(1).font = { bold: true };
      ws.columns = [
        { width: 18 }, // image col
        { width: 18 },
        { width: 14 },
        { width: 14 },
        { width: 16 },
        { width: 12 }
      ];

      // Add data rows and images
      for (let i = 0; i < products.length; i++) {
        const p = products[i];
        const rowIndex = i + 2; // row 1 is header
        const code = p.code || p.id || '';
        const size = p.size || '';
        const material = p.material || '';
        const unit = p.unit || '';
        const qty = stockData[code] ?? 0;
        ws.addRow(['', code, size, material, unit, qty]);
        ws.getRow(rowIndex).height = 60; // make room for image

        if (p.imageData) {
          try {
            let ext = 'png';
            let base64 = p.imageData;
            if (base64.startsWith('data:')) {
              // data:[mime];base64,xxxx
              const m = base64.match(/^data:(.*?);base64,(.*)$/);
              if (m) { base64 = m[2]; const mime = m[1]; if (mime.includes('jpeg')||mime.includes('jpg')) ext='jpeg'; if (mime.includes('png')) ext='png'; }
            }
            const imgId = wb.addImage({ base64: base64, extension: ext });
            // Place image at column A, this row
            ws.addImage(imgId, {
              tl: { col: 0, row: rowIndex-1 }, // zero-based indices
              ext: { width: 80, height: 50 }
            });
          } catch(e) { console.warn('Embed image failed for', code, e); }
        }
      }

      // Download
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const today = new Date().toISOString().split('T')[0];
      a.href = url; a.download = `Ton_kho_${today}.xlsx`; a.click();
      URL.revokeObjectURL(url);
      GM_ui.toast('✅ Đã xuất Excel tồn kho kèm hình ảnh');
    } catch (e) {
      console.error(e); GM_ui.toast('❌ Lỗi xuất Excel tồn kho');
    }
  }
  
  window.showStockImageZoom = function(imageSrc) {
    // Remove existing zoom if any
    const existingZoom = document.getElementById('stock-image-zoom');
    if (existingZoom) existingZoom.remove();
    
    const zoomDiv = document.createElement('div');
    zoomDiv.id = 'stock-image-zoom';
    zoomDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0);
      z-index: 10000;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      padding: 20px;
      transition: all 0.3s ease;
      max-width: 90vw;
      max-height: 90vh;
    `;
    
    zoomDiv.innerHTML = `
      <img src="${imageSrc}" style="max-width: 500px; max-height: 400px; border-radius: 8px;" />
      <div style="text-align: center; margin-top: 15px;">
        <button onclick="this.parentElement.parentElement.remove()" class="btn ghost" style="padding: 8px 16px;">Đóng</button>
      </div>
    `;
    
    document.body.appendChild(zoomDiv);
    
    // Animate in
    setTimeout(() => zoomDiv.style.transform = 'translate(-50%, -50%) scale(1)', 10);
    
    // Close on click outside
    zoomDiv.addEventListener('click', (e) => {
      if (e.target === zoomDiv) zoomDiv.remove();
    });
  };
})();