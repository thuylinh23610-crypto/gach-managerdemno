(function(){
  GM_router.register('exports', renderExportsPage);
  let currentExportData = {};
  // Helpers: round number to 2 decimals and format for display (vi-VN)
  function round2(n){
    const v = parseFloat(n);
    if (isNaN(v)) return 0;
    return Math.round((v + Number.EPSILON) * 100) / 100;
  }
  function formatQty(n){
    const v = round2(n);
    return v.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  // Normalize unit to only 'VNĐ/Thùng' or 'VNĐ/m²'
  function normalizeUnit(u){
    let s = String(u||'').trim();
    if(!s) return '';
    const sLower = s.toLowerCase();
    // Any meter-based unit (m, m2, m², vnd/vnđ variants)
    if (/vnd\s*\/\s*m\b/.test(sLower) || /vnđ\s*\/\s*m\b/.test(sLower) || /\bm2\b/.test(sLower) || /m²/.test(sLower) || /\/(m2|m²|m)\b/.test(sLower)) {
      return 'VNĐ/m²';
    }
    // Thùng with or without prefix
    if (sLower.includes('thùng')) return 'VNĐ/Thùng';
    // Exact legacy price units
    if (/^(vnd|vnđ)\s*\/\s*m2$/.test(sLower) || /^(vnd|vnđ)\s*\/\s*m²$/.test(sLower)) return 'VNĐ/m²';
    if (/^(vnd|vnđ)\s*\/\s*thùng$/.test(sLower)) return 'VNĐ/Thùng';
    return '';
  }
  
  // Hàm tính tồn kho (khớp theo cả ID và Mã để chống lệch dữ liệu)
  function calculateStock(productCode) {
    const importReceipts = GM_receipts.list('import') || [];
    const exportReceipts = GM_receipts.list('export') || [];
    const products = GM_products.list() || [];

    const byId = Object.create(null);
    const byCode = Object.create(null);
    products.forEach(p => { if (!p) return; byId[p.id] = p; const code = p.code || p.id; if (code) byCode[code] = p; });

    const matches = (item) => {
      if (!item) return false;
      const pid = item.productId; if (!pid) return false;
      if (pid === productCode) return true;
      const pById = byId[pid]; if (pById && (pById.code === productCode || pById.id === productCode)) return true;
      const pByCode = byCode[pid]; if (pByCode && (pByCode.code === productCode || pByCode.id === productCode)) return true;
      return false;
    };

    let totalImport = 0; let totalExport = 0;
    importReceipts.forEach(r => { (r.items || []).forEach(item => { if (matches(item)) totalImport += parseFloat(item.quantity) || 0; }); });
    exportReceipts.forEach(r => { (r.items || []).forEach(item => { if (matches(item)) totalExport += parseFloat(item.quantity) || 0; }); });
    return totalImport - totalExport;
  }

  // Lấy tồn kho cho tất cả sản phẩm
  function getAllStock() {
    const products = GM_products.list() || [];
    const importReceipts = GM_receipts.list('import') || [];
    const exportReceipts = GM_receipts.list('export') || [];

    const importById = Object.create(null);
    const exportById = Object.create(null);

    importReceipts.forEach(r => { (r.items || []).forEach(item => { const pid = item.productId; if (!pid) return; importById[pid] = (importById[pid] || 0) + (parseFloat(item.quantity) || 0); }); });
    exportReceipts.forEach(r => { (r.items || []).forEach(item => { const pid = item.productId; if (!pid) return; exportById[pid] = (exportById[pid] || 0) + (parseFloat(item.quantity) || 0); }); });

    const stockData = {};
    products.forEach(p => { const pid = p.id; const code = p.code || p.id; const stock = (importById[pid] || 0) - (exportById[pid] || 0); stockData[code] = stock; });
    return stockData;
  }

  // Lịch sử phiếu xuất
  function renderExportHistory(){
    const list = (GM_receipts.list('export') || []).slice().reverse();
    if(list.length === 0){
      return `
        <div class='card'>
          <h3 style='margin:0 0 12px 0;'>📜 Lịch sử phiếu xuất</h3>
          <div class='empty'>
            <h3>Chưa có phiếu xuất</h3>
            <p>Tạo phiếu xuất đầu tiên ở trên.</p>
          </div>
        </div>
      `;
    }

    const rows = list.map((r, idx)=>{
      const total = r.totalAmount != null ? r.totalAmount : (r.items||[]).reduce((s,it)=> s + (Number(it.quantity)||0)*(Number(it.price)||0), 0);
      const prepaid = Number(r.prepaidAmount)||0;
      const final = total - prepaid;
      const qty = (r.items||[]).reduce((s,it)=> s + (Number(it.quantity)||0), 0);
      return `
        <tr>
          <td style='text-align:center;vertical-align:middle;'>${idx+1}</td>
          <td style='text-align:center;vertical-align:middle;font-weight:600;color:var(--primary);'>${r.receiptCode||''}</td>
          <td style='text-align:center;vertical-align:middle;'>${GM_utils.formatDate(r.date)}</td>
          <td style='text-align:left;vertical-align:middle;'>${r.partnerName||''}</td>
          <td style='text-align:left;vertical-align:middle;'>${r.partnerPhone||''}</td>
          <td style='text-align:right;vertical-align:middle;'>${formatQty(qty)}</td>
          <td style='text-align:right;vertical-align:middle;'>${GM_utils.formatMoney(total)}</td>
          <td style='text-align:right;vertical-align:middle;color:var(--success);'>${GM_utils.formatMoney(prepaid)}</td>
          <td style='text-align:right;vertical-align:middle;font-weight:600;color:var(--primary);'>${GM_utils.formatMoney(final)}</td>
          <td style='text-align:center;vertical-align:middle;white-space:nowrap;'>
            <button class='btn ghost' style='padding:4px 8px' onclick='viewExportOrder("${r.id}")'>Xem</button>
            <button class='btn ghost' style='padding:4px 8px' onclick='editExportReceipt("${r.id}")'>Sửa</button>
            <button class='btn danger' style='padding:4px 8px' onclick='deleteExportReceipt("${r.id}")'>Xóa</button>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class='card'>
        <h3 style='margin:0 0 12px 0;'>📜 Lịch sử phiếu xuất</h3>
        <div class='table-wrap'>
          <table class='table'>
            <thead>
              <tr>
                <th style='width:60px;text-align:center;vertical-align:middle;'>STT</th>
                <th style='width:120px;text-align:center;vertical-align:middle;'>Số phiếu</th>
                <th style='width:120px;text-align:center;vertical-align:middle;'>Ngày</th>
                <th style='min-width:200px;text-align:center;vertical-align:middle;'>Khách hàng</th>
                <th style='width:150px;text-align:center;vertical-align:middle;'>SĐT</th>
                <th style='width:100px;text-align:center;vertical-align:middle;'>SL SP</th>
                <th style='width:130px;text-align:center;vertical-align:middle;'>Tổng tiền</th>
                <th style='width:130px;text-align:center;vertical-align:middle;'>Đã thanh toán</th>
                <th style='width:150px;text-align:center;vertical-align:middle;'>Phải thu</th>
                <th style='width:200px;text-align:center;vertical-align:middle;'>Thao tác</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderExportsPage(root){
    const nextReceiptNumber = getNextReceiptNumber();
    const currentDate = new Date().toISOString().split('T')[0];
    const stockMap = getAllStock();

    root.innerHTML = `
      <div class='card'>
        <div class='grid' style='grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px;margin-bottom:24px;'>
          <div>
            <label style='font-weight:500;color:var(--text);font-size:15px;display:block;margin-bottom:6px;'>👤 Tên khách hàng *</label>
            <input id='customer-name' class='input' placeholder='Nhập tên khách hàng' required />
          </div>
          <div>
            <label style='font-weight:500;color:var(--text);font-size:15px;display:block;margin-bottom:6px;'>🏷️ Đối tượng</label>
            <select id='customer-type' class='input'>
              <option value=''>-- Chọn đối tượng --</option>
              <option value='Cửa hàng'>Cửa hàng</option>
              <option value='Nhà thầu'>Nhà thầu</option>
              <option value='Chủ nhà'>Chủ nhà</option>
            </select>
          </div>
          <div>
            <label style='font-weight:500;color:var(--text);font-size:15px;display:block;margin-bottom:6px;'>📞 Số điện thoại *</label>
            <input id='customer-phone' class='input' placeholder='Nhập số điện thoại' required onblur='loadCustomerInfo(this.value)' />
          </div>
          <div>
            <label style='font-weight:500;color:var(--text);font-size:15px;display:block;margin-bottom:6px;'>📍 Địa chỉ *</label>
            <input id='customer-address' class='input' placeholder='Nhập địa chỉ' required />
          </div>
        </div>

        <div class='grid' style='grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px;'>
          <div>
            <label style='font-weight:500;color:var(--text);font-size:15px;display:block;margin-bottom:6px;'>📅 Ngày xuất</label>
            <input id='export-date' type='date' class='input' value='${currentDate}' />
          </div>
          <div>
            <label style='font-weight:500;color:var(--text);font-size:15px;display:block;margin-bottom:6px;'>📄 Số phiếu xuất</label>
            <input id='receipt-number' class='input' value='${nextReceiptNumber}' readonly style='background:#f8fafc;' />
          </div>
          <div>
            <label style='font-weight:500;color:var(--text);font-size:15px;display:block;margin-bottom:6px;'>💰 Đã thanh toán trước</label>
            <input id='prepaid-amount' class='input' type='number' min='0' placeholder='0' value='0' />
          </div>
        </div>

        <div style='margin-bottom:16px;'>
          <label style='font-weight:500;color:var(--text);font-size:16px;display:block;margin-bottom:12px;'>📦 Thông tin sản phẩm xuất</label>
          <div class='table-wrap'>
            <table class='table' id='export-products-table'>
              <thead>
                <tr>
                  <th style='width:50px'>STT</th>
                  <th style='width:160px'>Mã sản phẩm</th>
                  <th style='width:120px'>Số lượng</th>
                  <th style='width:140px'>Đơn vị tính</th>
                  <th style='width:140px'>Giá tiền</th>
                  <th style='width:140px'>Thành tiền</th>
                  <th style='width:130px'>Ghi chú</th>
                  <th style='width:60px'>Xóa</th>
                </tr>
              </thead>
              <tbody id='export-tbody'>
                <tr>
                  <td>1</td>
                  <td><input class='input product-code' placeholder='Nhập mã SP' list='products-datalist' style='width:100%;' onchange='loadProductPrice(this)' oninput='loadProductPrice(this)' /></td>
                  <td><input class='input quantity' type='number' min='0' step='0.01' placeholder='SL' style='width:100%;' onchange='onQuantityChange(this)' /></td>
                  <td>
                    <select class='input unit' style='width:100%;'>
                      <option value=''>Chọn đơn vị</option>
                      <option value='VNĐ/Thùng'>VNĐ/Thùng</option>
                      <option value='VNĐ/m²'>VNĐ/m²</option>
                    </select>
                  </td>
                  <td>
                    <input class='input price' type='number' min='0' placeholder='Giá' style='width:100%;' oninput='updatePriceDisplay(this);calculateRowTotal(this)' />
                    <div class='price-display' style='text-align:right;font-size:12px;color:#374151;opacity:.9;margin-top:2px;'>0</div>
                  </td>
                  <td>
                    <input class='total' type='hidden' />
                    <span class='total-display' style='display:inline-block;width:100%;background:#f8fafc;padding:6px 8px;border:1px solid var(--border);border-radius:6px;text-align:right;'>0</span>
                  </td>
                  <td><input class='input note' placeholder='Ghi chú' style='width:100%;' /></td>
                  <td><button type='button' class='btn danger' style='padding:4px 8px;' onclick='removeExportRow(this)'>×</button></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style='margin-top:12px;display:flex;gap:12px;'>
            <button type='button' class='btn ghost' onclick='addExportRow()'>➕ Thêm dòng</button>
          </div>
        </div>

        <div style='background:#f8fafc;padding:16px;border-radius:8px;margin-bottom:16px;'>
          <div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;'>
            <span style='font-weight:500;font-size:16px;'>Đã thanh toán:</span>
            <span id='paid-amount' style='font-size:16px;color:var(--success);'>0 VNĐ</span>
          </div>
          <div style='display:flex;justify-content:space-between;align-items:center;'>
            <span style='font-weight:600;font-size:18px;color:var(--text);'>Tổng tiền phải thu:</span>
            <span id='total-amount' style='font-size:18px;font-weight:600;color:var(--primary);'>0 VNĐ</span>
          </div>
        </div>

        <div style='text-align:right;padding-top:16px;border-top:1px solid var(--border);display:flex;gap:12px;justify-content:flex-end;'>
          <button type='button' class='btn ghost' onclick='previewReceipt()'>👁️ Xem trước phiếu</button>
          <button class='btn' onclick='submitExport()'>✅ Xuất kho</button>
        </div>
      </div>

      <div id='export-history' style='margin-top:24px;'>
        ${renderExportHistory()}
      </div>

      <datalist id='products-datalist'>
        ${GM_products.list().map(p => {
          const code = p.code || p.id;
          const stock = stockMap[code] ?? 0;
          return `<option value='${code}'>${code} -- Tồn kho: ${formatQty(stock)}</option>`;
        }).join('')}
      </datalist>
    `;

    bindExportEvents();
  }

  function getNextReceiptNumber() {
    const exports = GM_receipts.list('export');
    const lastNumber = exports.length > 0 ? Math.max(...exports.map(r => {
      const match = r.receiptCode.match(/PX(\d+)/);
      return match ? parseInt(match[1]) : 0;
    })) : 0;
    return `PX${String(lastNumber + 1).padStart(3, '0')}`;
  }

  function bindExportEvents() {
    updateReceiptNumber();
    updateTotals();
    
    // Add event listener for prepaid amount
    setTimeout(() => {
      const prepaidInput = document.getElementById('prepaid-amount');
      if (prepaidInput) {
        prepaidInput.addEventListener('input', updateTotals);
      }
      
      // Auto-save functionality
      setupAutoSave();
      loadSavedFormData();
    }, 100);
  }
  
  // Auto-save form data to prevent data loss
  function setupAutoSave() {
    const fieldsToSave = [
      'customer-name', 'customer-phone', 'customer-address', 
      'export-date', 'prepaid-amount'
    ];
    
    fieldsToSave.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.addEventListener('input', saveFormData);
        field.addEventListener('change', saveFormData);
      }
    });
    
    // Save table data on any change
    const table = document.getElementById('export-products-table');
    if (table) {
      table.addEventListener('input', saveTableData);
      table.addEventListener('change', saveTableData);
    }
  }
  
  function saveFormData() {
    const formData = {
      customerName: document.getElementById('customer-name')?.value || '',
      customerPhone: document.getElementById('customer-phone')?.value || '',
      customerAddress: document.getElementById('customer-address')?.value || '',
      exportDate: document.getElementById('export-date')?.value || '',
      prepaidAmount: document.getElementById('prepaid-amount')?.value || '0',
      timestamp: Date.now()
    };
    
    localStorage.setItem('export_form_data', JSON.stringify(formData));
  }
  
  function saveTableData() {
    const rows = document.querySelectorAll('#export-tbody tr');
    const tableData = [];
    
    rows.forEach(row => {
      const productCode = row.querySelector('.product-code')?.value || '';
      const quantity = row.querySelector('.quantity')?.value || '';
      const unit = row.querySelector('.unit')?.value || '';
      const price = row.querySelector('.price')?.value || '';
      const note = row.querySelector('.note')?.value || '';
      
      if (productCode || quantity || unit || price || note) {
        tableData.push({
          productCode,
          quantity,
          unit,
          price,
          note
        });
      }
    });
    
    localStorage.setItem('export_table_data', JSON.stringify(tableData));
  }
  
  function loadSavedFormData() {
    try {
      const savedFormData = localStorage.getItem('export_form_data');
      const savedTableData = localStorage.getItem('export_table_data');
      
      if (savedFormData) {
        const formData = JSON.parse(savedFormData);
        const timeDiff = Date.now() - (formData.timestamp || 0);
        
        // Only restore if data is less than 1 hour old
        if (timeDiff < 3600000) {
          document.getElementById('customer-name').value = formData.customerName || '';
          document.getElementById('customer-phone').value = formData.customerPhone || '';
          document.getElementById('customer-address').value = formData.customerAddress || '';
          document.getElementById('export-date').value = formData.exportDate || '';
          document.getElementById('prepaid-amount').value = formData.prepaidAmount || '0';
          
          // Silent restore: don't toast to avoid spam during input
        }
      }
      
      if (savedTableData) {
        const tableData = JSON.parse(savedTableData);
        if (tableData.length > 0) {
          restoreTableData(tableData);
          // Silent restore: don't toast to avoid spam during input
        }
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  }
  
  function restoreTableData(tableData) {
    const tbody = document.getElementById('export-tbody');
    tbody.innerHTML = '';
    
    tableData.forEach((rowData, index) => {
      // Normalize unit to only VNĐ/Thùng or VNĐ/m²
      let normalizedUnit = normalizeUnit(rowData.unit);
      const totalNow = (parseFloat(rowData.quantity)||0) * (parseFloat(rowData.price)||0);
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${index + 1}</td>
  <td><input class='input product-code' placeholder='Nhập mã SP' list='products-datalist' style='width:100%;' value='${rowData.productCode}' onchange='loadProductPrice(this)' oninput='loadProductPrice(this)' /></td>
  <td><input class='input quantity' type='number' min='0' step='0.01' placeholder='SL' style='width:100%;' value='${rowData.quantity}' onchange='onQuantityChange(this)' /></td>
        <td>
          <select class='input unit' style='width:100%;'>
            <option value=''>Chọn đơn vị</option>
            <option value='VNĐ/Thùng' ${normalizedUnit === 'VNĐ/Thùng' ? 'selected' : ''}>VNĐ/Thùng</option>
            <option value='VNĐ/m²' ${normalizedUnit === 'VNĐ/m²' ? 'selected' : ''}>VNĐ/m²</option>
          </select>
        </td>
        <td>
          <input class='input price' type='number' min='0' placeholder='Giá' style='width:100%;' value='${rowData.price}' oninput='updatePriceDisplay(this);calculateRowTotal(this)' />
          <div class='price-display' style='text-align:right;font-size:12px;color:#374151;opacity:.9;margin-top:2px;'>${GM_utils.formatMoney(parseFloat(rowData.price)||0)}</div>
        </td>
        <td>
          <input class='total' type='hidden' />
          <span class='total-display' style='display:inline-block;width:100%;background:#f8fafc;padding:6px 8px;border:1px solid var(--border);border-radius:6px;text-align:right;'>${GM_utils.formatMoney(totalNow)}</span>
        </td>
        <td><input class='input note' placeholder='Ghi chú' style='width:100%;' value='${rowData.note}' /></td>
        <td><button type='button' class='btn danger' style='padding:4px 8px;' onclick='removeExportRow(this)'>×</button></td>
      `;
      tbody.appendChild(row);
      
      // Initialize total display for restored rows
  const qty = round2(rowData.quantity);
      const price = parseFloat(rowData.price) || 0;
  const total = round2(qty * price);
      const totalHidden = row.querySelector('.total');
      const totalDisplay = row.querySelector('.total-display');
      if (totalHidden) totalHidden.value = total;
      if (totalDisplay) totalDisplay.textContent = GM_utils.formatMoney(total);
    });
    
    // Add at least one empty row if none exist
    if (tableData.length === 0) {
      addExportRow();
    }
    
    updateTotals();
  }
  
  function clearSavedFormData() {
    localStorage.removeItem('export_form_data');
    localStorage.removeItem('export_table_data');
  }
  
  // Edit export receipt
  window.editExportReceipt = async function(receiptId) {
    const receipt = GM_receipts.list('export').find(r => r.id === receiptId);
    if (!receipt) {
      GM_ui.toast('❌ Không tìm thấy phiếu xuất');
      return;
    }
    
    // Fill form with receipt data
    document.getElementById('customer-name').value = receipt.partnerName || '';
    document.getElementById('customer-phone').value = receipt.partnerPhone || '';
  document.getElementById('customer-address').value = receipt.partnerAddress || '';
  const typeEl = document.getElementById('customer-type'); if (typeEl) typeEl.value = receipt.partnerType || '';
    document.getElementById('export-date').value = receipt.date || '';
    document.getElementById('receipt-number').value = receipt.receiptCode || '';
    document.getElementById('prepaid-amount').value = receipt.prepaidAmount || '0';
    
    // Clear existing table rows
    const tbody = document.getElementById('export-tbody');
    tbody.innerHTML = '';
    
    // Add receipt items to table
    receipt.items.forEach((item, index) => {
      const product = GM_products.list().find(p => p.id === item.productId);
      // Normalize unit to only VNĐ/Thùng or VNĐ/m²
      let normalizedUnit = normalizeUnit(item.unit);
      const totalNow = (parseFloat(item.quantity)||0) * (parseFloat(item.price)||0);
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${index + 1}</td>
  <td><input class='input product-code' placeholder='Nhập mã SP' list='products-datalist' style='width:100%;' value='${product?.code || ''}' onchange='loadProductPrice(this)' oninput='loadProductPrice(this)' /></td>
  <td><input class='input quantity' type='number' min='0' step='0.01' placeholder='SL' style='width:100%;' value='${item.quantity}' onchange='onQuantityChange(this)' /></td>
        <td>
          <select class='input unit' style='width:100%;'>
            <option value=''>Chọn đơn vị</option>
            <option value='VNĐ/Thùng' ${normalizedUnit === 'VNĐ/Thùng' ? 'selected' : ''}>VNĐ/Thùng</option>
            <option value='VNĐ/m²' ${normalizedUnit === 'VNĐ/m²' ? 'selected' : ''}>VNĐ/m²</option>
          </select>
        </td>
        <td>
          <input class='input price' type='number' min='0' placeholder='Giá' style='width:100%;' value='${item.price}' oninput='updatePriceDisplay(this);calculateRowTotal(this)' />
          <div class='price-display' style='text-align:right;font-size:12px;color:#374151;opacity:.9;margin-top:2px;'>${GM_utils.formatMoney(parseFloat(item.price)||0)}</div>
        </td>
        <td>
          <input class='total' type='hidden' />
          <span class='total-display' style='display:inline-block;width:100%;background:#f8fafc;padding:6px 8px;border:1px solid var(--border);border-radius:6px;text-align:right;'>${GM_utils.formatMoney(totalNow)}</span>
        </td>
        <td><input class='input note' placeholder='Ghi chú' style='width:100%;' value='${item.note || ''}' /></td>
        <td><button type='button' class='btn danger' style='padding:4px 8px;' onclick='removeExportRow(this)'>×</button></td>
      `;
      tbody.appendChild(row);

      // Initialize hidden total value
      const totalHidden = row.querySelector('.total');
      if (totalHidden) totalHidden.value = totalNow;
    });
    
    // Update totals
    updateTotals();
    
    // Change submit button to update mode
    const submitBtn = document.querySelector('.btn[onclick="submitExport()"]');
    submitBtn.textContent = '🔄 Cập nhật phiếu xuất';
    submitBtn.setAttribute('onclick', `updateExportReceipt('${receiptId}')`);
    
    // Scroll to form
    document.querySelector('.card').scrollIntoView({ behavior: 'smooth' });
    GM_ui.toast('📝 Đã load thông tin phiếu xuất để chỉnh sửa');
  };
  
  // Update export receipt
  window.updateExportReceipt = async function(receiptId) {
  const customerName = document.getElementById('customer-name').value.trim();
    const customerPhone = document.getElementById('customer-phone').value.trim();
    const customerAddress = document.getElementById('customer-address').value.trim();
    const customerType = (document.getElementById('customer-type')?.value || '').trim();
    const exportDate = document.getElementById('export-date').value;
    const receiptNumber = document.getElementById('receipt-number').value;
    const prepaidAmount = parseFloat(document.getElementById('prepaid-amount').value) || 0;
    
    if (!customerName) {
      GM_ui.toast('Vui lòng nhập tên khách hàng');
      return;
    }
    
    if (!customerPhone) {
      GM_ui.toast('Vui lòng nhập số điện thoại');
      return;
    }
    
    if (!customerAddress) {
      GM_ui.toast('Vui lòng nhập địa chỉ');
      return;
    }

    // Đồng bộ KH qua service để realtime
    try {
      if (window.GM_customers && GM_customers.create && GM_customers.update) {
        const existing = (GM_state.customers || []).find(c => c.phone === customerPhone);
        if (existing) {
          const needsUpdate = existing.name !== customerName || existing.address !== customerAddress || existing.type !== customerType;
          if (needsUpdate) {
            await GM_customers.update(existing.id, {
              name: customerName,
              phone: customerPhone,
              address: customerAddress,
              type: customerType,
              updatedAt: GM_utils.nowISO()
            });
          }
        } else {
          await GM_customers.create({
            name: customerName,
            phone: customerPhone,
            address: customerAddress,
            type: customerType,
            createdAt: GM_utils.nowISO()
          });
        }
      }
    } catch(e) { console.warn('Customer sync (update) failed', e); }

    const rows = document.querySelectorAll('#export-tbody tr');
    const items = [];
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const productCode = row.querySelector('.product-code').value.trim();
  const quantity = parseFloat(row.querySelector('.quantity').value) || 0;
      const unit = row.querySelector('.unit').value;
      const price = parseFloat(row.querySelector('.price').value) || 0;
      const note = row.querySelector('.note').value.trim();
      
      if (!productCode) {
        GM_ui.toast(`Dòng ${i + 1}: Vui lòng nhập mã sản phẩm`);
        return;
      }
      
      if (quantity < 0) {
        GM_ui.toast(`Dòng ${i + 1}: Số lượng không được âm`);
        return;
      }
      
      if (!unit) {
        GM_ui.toast(`Dòng ${i + 1}: Vui lòng chọn đơn vị tính`);
        return;
      }

      if (price <= 0) {
        GM_ui.toast(`Dòng ${i + 1}: Giá tiền phải lớn hơn 0`);
        return;
      }

      let product = GM_products.list().find(p => p.code === productCode || p.id === productCode);
      if (!product) {
        GM_ui.toast(`Sản phẩm ${productCode} không tồn tại`);
        return;
      }

      items.push({
        productId: product.id,
        quantity: quantity,
        unit: normalizeUnit(unit),
        price: price,
        note: note
      });
    }

    if (items.length === 0) {
      GM_ui.toast('Vui lòng thêm ít nhất 1 sản phẩm');
      return;
    }

    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const updatedData = {
      receiptCode: receiptNumber,
      date: exportDate,
      partnerName: customerName,
      partnerType: customerType,
      partnerPhone: customerPhone,
      partnerAddress: customerAddress,
      items: items,
      type: 'export',
      prepaidAmount: prepaidAmount,
      totalAmount: totalAmount,
      note: `Xuất kho cho ${customerName} - ${customerPhone} (Đã cập nhật)`
    };

    try {
      await GM_receipts.update(receiptId, updatedData);
      await GM_stateAPI.persistAll();
      GM_ui.toast(`✅ Đã cập nhật phiếu xuất - ${receiptNumber}`);
      
      // Reset form and button
      clearSavedFormData();
      clearExportForm();
      
      const submitBtn = document.querySelector('.btn[onclick*="updateExportReceipt"]');
      submitBtn.textContent = '✅ Xuất kho';
      submitBtn.setAttribute('onclick', 'submitExport()');
      
      setTimeout(() => {
        GM_router.go('exports');
      }, 1000);
    } catch (error) {
      console.error('Lỗi cập nhật phiếu xuất:', error);
      GM_ui.toast('❌ Có lỗi xảy ra khi cập nhật phiếu xuất');
    }
  };
  
  // Delete export receipt
  window.deleteExportReceipt = async function(receiptId) {
    const receipt = GM_receipts.list('export').find(r => r.id === receiptId);
    if (!receipt) {
      GM_ui.toast('❌ Không tìm thấy phiếu xuất');
      return;
    }
    
    const confirmed = await GM_ui.confirmBox(`Bạn có chắc muốn xóa phiếu xuất ${receipt.receiptCode}?<br><br>⚠️ <strong>Lưu ý:</strong> Xóa phiếu này sẽ tự động cập nhật lại tồn kho!`);
    if (!confirmed) return;
    
    try {
      await GM_receipts.delete(receiptId);
      await GM_stateAPI.persistAll();
      GM_ui.toast(`✅ Đã xóa phiếu xuất ${receipt.receiptCode} - Tồn kho đã được cập nhật`);
      
      // Refresh immediately without delay
      GM_router.go('exports');
    } catch (error) {
      console.error('Lỗi xóa phiếu xuất:', error);
      GM_ui.toast('❌ Có lỗi xảy ra khi xóa phiếu xuất');
    }
  };
  
  

  function updateReceiptNumber() {
    const receiptInput = document.getElementById('receipt-number');
    if (receiptInput) {
      receiptInput.value = getNextReceiptNumber();
    }
  }

  window.loadCustomerInfo = function(phone) {
    if (!phone.trim()) return;
    
    // Tìm khách hàng theo số điện thoại
    const customer = GM_state.customers?.find(c => c.phone === phone.trim());
    if (customer) {
      const nameInput = document.getElementById('customer-name');
      const addressInput = document.getElementById('customer-address');
      const typeInput = document.getElementById('customer-type');
      
      // Chỉ điền nếu các trường đang trống
      if (!nameInput.value.trim()) nameInput.value = customer.name || '';
      if (!addressInput.value.trim()) addressInput.value = customer.address || '';
      if (typeInput && !typeInput.value) typeInput.value = customer.type || '';
    }
  };

  window.loadProductPrice = function(input) {
    const productCode = input.value.trim();
    if (!productCode) return;
    
    const product = GM_products.list().find(p => p.code === productCode || p.id === productCode);
    if (product) {
      const currentStock = calculateStock(productCode);
      const row = input.closest('tr');
      const priceInput = row.querySelector('.price');
      const unitSelect = row.querySelector('.unit');
      const quantityInput = row.querySelector('.quantity');
      
      // Hiển thị cảnh báo nếu tồn kho âm
      if (currentStock < 0) {
        GM_ui.toast(`⚠️ Cảnh báo: Sản phẩm ${productCode} có tồn kho âm (${currentStock})`, {type: 'warning'});
        input.style.borderColor = '#f59e0b';
        input.style.backgroundColor = '#fef3c7';
      } else {
        input.style.borderColor = '';
        input.style.backgroundColor = '';
      }
      
      if (priceInput && !priceInput.value) {
        priceInput.value = product.price || 0;
        const priceDisp = row.querySelector('.price-display');
        if (priceDisp) priceDisp.textContent = GM_utils.formatMoney(product.price || 0);
      }
      
      if (unitSelect) {
        const mapped = normalizeUnit(product.unit);
        if (mapped) {
          const options = Array.from(unitSelect.options);
          const found = options.find(o=>o.value===mapped);
          if (found) unitSelect.value = mapped; else {
            const o=document.createElement('option'); o.value=mapped; o.textContent=mapped; unitSelect.appendChild(o); unitSelect.value=mapped;
          }
        } else {
          unitSelect.value = '';
        }
      }
      
      calculateRowTotal(input);
    }
  };

  window.updatePriceDisplay = function(el){
    const row = el.closest('tr');
    const v = parseFloat(el.value)||0;
    const disp = row.querySelector('.price-display');
    if(disp) disp.textContent = GM_utils.formatMoney(v);
  }

  window.calculateRowTotal = function(input) {
    const row = input.closest('tr');
    const quantity = round2(row.querySelector('.quantity').value);
    // write back the rounded quantity to input to enforce 2 decimals
    const qtyInput = row.querySelector('.quantity');
    if (qtyInput) qtyInput.value = quantity;
    const price = parseFloat(row.querySelector('.price').value) || 0;
    const totalHidden = row.querySelector('.total');
    const totalDisplay = row.querySelector('.total-display');
    const total = round2(quantity * price);
    if (totalHidden) totalHidden.value = total;
    if (totalDisplay) totalDisplay.textContent = GM_utils.formatMoney(total);
    updateTotals();
  };

  window.onQuantityChange = function(input){
    const v = round2(input.value);
    input.value = v;
    calculateRowTotal(input);
  }

  function updateTotals() {
    const rows = document.querySelectorAll('#export-tbody tr');
    let totalAmount = 0;
    
    rows.forEach(row => {
  const total = parseFloat(row.querySelector('.total').value) || 0;
      totalAmount += total;
    });
    
    const prepaidAmount = parseFloat(document.getElementById('prepaid-amount').value) || 0;
    const finalAmount = totalAmount - prepaidAmount;
    
  document.getElementById('paid-amount').textContent = GM_utils.formatMoney(prepaidAmount) + ' VNĐ';
  document.getElementById('total-amount').textContent = GM_utils.formatMoney(finalAmount) + ' VNĐ';
    
    // Lưu dữ liệu hiện tại
    currentExportData = {
      totalAmount,
      prepaidAmount,
      finalAmount
    };
  }

  window.addExportRow = function() {
    const tbody = document.getElementById('export-tbody');
    const rowCount = tbody.children.length + 1;
    
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
      <td>${rowCount}</td>
  <td><input class='input product-code' placeholder='Nhập mã SP' list='products-datalist' style='width:100%;' onchange='loadProductPrice(this)' oninput='loadProductPrice(this)' /></td>
  <td><input class='input quantity' type='number' min='0' step='0.01' placeholder='SL' style='width:100%;' onchange='onQuantityChange(this)' /></td>
      <td>
        <select class='input unit' style='width:100%;'>
          <option value=''>Chọn đơn vị</option>
          <option value='VNĐ/Thùng'>VNĐ/Thùng</option>
          <option value='VNĐ/m²'>VNĐ/m²</option>
        </select>
      </td>
      <td>
        <input class='input price' type='number' min='0' placeholder='Giá' style='width:100%;' oninput='updatePriceDisplay(this);calculateRowTotal(this)' />
        <div class='price-display' style='text-align:right;font-size:12px;color:#374151;opacity:.9;margin-top:2px;'>0</div>
      </td>
      <td>
        <input class='total' type='hidden' />
        <span class='total-display' style='display:inline-block;width:100%;background:#f8fafc;padding:6px 8px;border:1px solid var(--border);border-radius:6px;text-align:right;'>0</span>
      </td>
      <td><input class='input note' placeholder='Ghi chú' style='width:100%;' /></td>
      <td><button type='button' class='btn danger' style='padding:4px 8px;' onclick='removeExportRow(this)'>×</button></td>
    `;
    
    tbody.appendChild(newRow);
  };

  window.removeExportRow = function(button) {
    const row = button.closest('tr');
    const tbody = document.getElementById('export-tbody');
    
    if (tbody.children.length <= 1) {
      GM_ui.toast('Phải có ít nhất 1 dòng sản phẩm');
      return;
    }
    
    row.remove();
    
    // Cập nhật lại số thứ tự
    Array.from(tbody.children).forEach((row, index) => {
      row.firstElementChild.textContent = index + 1;
    });
    
    updateTotals();
  };

  window.previewReceipt = function() {
    const customerName = document.getElementById('customer-name').value.trim();
    const customerType = (document.getElementById('customer-type')?.value || '').trim();
    const customerPhone = document.getElementById('customer-phone').value.trim();
    const customerAddress = document.getElementById('customer-address').value.trim();
    const exportDate = document.getElementById('export-date').value;
    const receiptNumber = document.getElementById('receipt-number').value;
    const prepaidAmount = parseFloat(document.getElementById('prepaid-amount').value) || 0;
    
    if (!customerName || !customerPhone || !customerAddress) {
      GM_ui.toast('Vui lòng điền đầy đủ thông tin khách hàng');
      return;
    }

    const rows = document.querySelectorAll('#export-tbody tr');
    const items = [];
    let totalAmount = 0;
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const productCode = row.querySelector('.product-code').value.trim();
  const quantity = round2(row.querySelector('.quantity').value);
      const unit = row.querySelector('.unit').value;
      const price = parseFloat(row.querySelector('.price').value) || 0;
      const total = parseFloat(row.querySelector('.total').value) || 0;
      const note = row.querySelector('.note').value.trim();
      
      if (productCode && quantity > 0) {
        const product = GM_products.list().find(p => p.code === productCode || p.id === productCode);
        items.push({
          code: productCode,
          name: product?.name || productCode,
          quantity: round2(quantity),
          unit: normalizeUnit(unit),
          price,
          total,
          note
        });
        totalAmount += total;
      }
    }

    if (items.length === 0) {
      GM_ui.toast('Vui lòng thêm ít nhất 1 sản phẩm');
      return;
    }

    const finalAmount = totalAmount - prepaidAmount;
    
    const previewHTML = `
      <style>
        /* Sticky footer for preview modal */
        .preview-footer { position: sticky; bottom: 0; display: flex; justify-content: flex-end; gap: 10px; background: rgba(255,255,255,0.95); padding: 10px; border-top: 1px solid #e5e7eb; backdrop-filter: saturate(1.2) blur(2px); }
        .preview-footer .btn { margin: 0; }
        @media print { .preview-footer { display: none !important; } }
      </style>
      <div id='receipt-preview' style='background:white;font-family:Arial,sans-serif;padding:24px;'>
        <!-- Company Header -->
        <div style='text-align:center;border-bottom:3px solid #2563eb;padding-bottom:18px;margin-bottom:18px;'>
          <h1 style='margin:0;font-size:22px;font-weight:800;color:#1e40af;text-transform:uppercase;letter-spacing:1px;'>CÔNG TY TNHH DV-TM NGUYEN KHAI</h1>
          <div style='margin-top:8px;font-size:13px;color:#64748b;line-height:1.5;'>
            <p style='margin:2px 0;'>Địa chỉ: 107 Tam Bình, Phường Tam Phú, TP Thủ Đức</p>
            <p style='margin:2px 0;'>MST: 0315811410 • ĐT: 0902.484.755 - 0933.611.365</p>
          </div>
        </div>

        <!-- Receipt Title -->
        <div style='text-align:center;margin-bottom:18px;'>
          <h2 style='margin:0;font-size:20px;font-weight:800;color:#dc2626;background:#fef2f2;border:2px solid #dc2626;display:inline-block;padding:6px 16px;border-radius:6px;'>PHIẾU XUẤT KHO</h2>
          <p style='margin:10px 0 0 0;font-size:14px;color:#374151;'>Số phiếu: <strong style='color:#2563eb;'>${receiptNumber}</strong> • Ngày xuất: <strong>${GM_utils.formatDate(exportDate)}</strong></p>
        </div>

        <!-- Customer Info -->
        <div style='background:#f8fafc;border-left:4px solid #3b82f6;padding:14px 16px;margin-bottom:18px;border-radius:8px;'>
          <h3 style='margin:0 0 8px 0;color:#dc2626;font-size:15px;text-transform:uppercase;border-bottom:1px solid #e5e7eb;padding-bottom:6px;'>THÔNG TIN KHÁCH HÀNG</h3>
          <div style='display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;'>
            <div>
              <p style='margin:4px 0;color:#374151;'><strong>Tên:</strong> ${customerName}</p>
              <p style='margin:4px 0;color:#374151;'><strong>SĐT:</strong> ${customerPhone}</p>
            </div>
            <div>
              <p style='margin:4px 0;color:#374151;'><strong>Địa chỉ:</strong> ${customerAddress}</p>
              <p style='margin:4px 0;color:#374151;'><strong>Ngày xuất:</strong> ${GM_utils.formatDate(exportDate)}</p>
              
            </div>
          </div>
        </div>

        <!-- Items Table -->
        <div>
          <table style='width:100%;border-collapse:separate;border-spacing:0 4px;background:#fff;font-size:13px;'>
            <thead>
              <tr style='background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:white;'>
                <th style='border:1px solid #ddd;padding:10px 8px;text-align:center;font-weight:600;'>Ngày</th>
                <th style='border:1px solid #ddd;padding:10px 12px;text-align:left;font-weight:600;'>Mã sản phẩm</th>
                <th style='border:1px solid #ddd;padding:10px 12px;text-align:center;font-weight:600;'>Đơn vị</th>
                <th style='border:1px solid #ddd;padding:10px 12px;text-align:center;font-weight:600;'>Số lượng</th>
                <th style='border:1px solid #ddd;padding:10px 12px;text-align:right;font-weight:600;'>Đơn giá</th>
                <th style='border:1px solid #ddd;padding:10px 12px;text-align:right;font-weight:600;'>Thành tiền</th>
                <th style='border:1px solid #ddd;padding:10px 12px;text-align:left;font-weight:600;'>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, index) => {
                const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
                return `
                  <tr style='background:${rowBg};'>
                    <td style='border:1px solid #e5e7eb;padding:10px 8px;text-align:center;color:#64748b;'>${GM_utils.formatDate(exportDate)}</td>
                    <td style='border:1px solid #e5e7eb;padding:10px;font-weight:600;color:#1e40af;'>${item.code}</td>
                    <td style='border:1px solid #e5e7eb;padding:10px;text-align:center;color:#64748b;'>${normalizeUnit(item.unit)}</td>
                    <td style='border:1px solid #e5e7eb;padding:10px;text-align:center;font-weight:600;color:#059669;'>${formatQty(item.quantity)}</td>
                    <td style='border:1px solid #e5e7eb;padding:10px;text-align:right;color:#374151;'>${GM_utils.formatMoney(item.price)}</td>
                    <td style='border:1px solid #e5e7eb;padding:10px;text-align:right;font-weight:700;color:#dc2626;'>${GM_utils.formatMoney(item.total)}</td>
                    <td style='border:1px solid #e5e7eb;padding:10px;color:#64748b;font-style:italic;'>${item.note || ''}</td>
                  </tr>
                `;
              }).join('')}
              <!-- Summary Rows: Deposit (Cọc) and Final Amount -->
              <tr style='background:#fef2f2;border-top:2px solid #dc2626;'>
                <td colspan='5' style='border:1px solid #e5e7eb;padding:12px;text-align:right;font-weight:bold;color:#dc2626;'>Cọc</td>
                <td style='border:1px solid #e5e7eb;padding:12px;text-align:right;font-weight:700;color:#dc2626;'>${GM_utils.formatMoney(prepaidAmount)}</td>
                <td style='border:1px solid #e5e7eb;padding:12px;'></td>
              </tr>
              <tr style='background:#f0f9ff;'>
                <td colspan='5' style='border:1px solid #e5e7eb;padding:12px;text-align:right;font-weight:bold;color:#1e40af;'>Tổng tiền phải thu</td>
                <td style='border:1px solid #e5e7eb;padding:12px;text-align:right;font-weight:700;color:#1e40af;'>${GM_utils.formatMoney(finalAmount)}</td>
                <td style='border:1px solid #e5e7eb;padding:12px;'></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Payment Info Section under items table -->
        <div style='background:#f0f9ff;border:2px solid #3b82f6;padding:14px 16px;margin:18px 0;border-radius:8px;'>
          <h3 style='margin:0;color:#1e40af;font-size:15px;text-transform:uppercase;'>THÔNG TIN TÀI KHOẢN THANH TOÁN</h3>
          <div>
            <p style='margin:5px 0;color:#374151;'><strong>Tài khoản 1:</strong> <span style='color:#059669;'>ACB - 6884547 NGUYEN VAN KHAI</span></p>
            <p style='margin:5px 0;color:#374151;'><strong>Tài khoản 2:</strong> <span style='color:#059669;'>SACOMBANK - 060056439628 HO THI KIM NGAN</span></p>
          </div>
        </div>

        <!-- Signature Section at the bottom -->
        <div style='display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:24px 0 0 0;'>
          <div style='text-align:center;'>
            <p style='margin:0 0 60px 0;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;padding-bottom:8px;'>Người nhận hàng</p>
            <p style='margin:0;color:#9ca3af;font-style:italic;'>${customerName}</p>
          </div>
          <div style='text-align:center;'>
            <p style='margin:0 0 60px 0;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;padding-bottom:8px;'>Người lập phiếu</p>
            <p style='margin:0;color:#9ca3af;'>&nbsp;</p>
          </div>
        </div>
      </div>
      <div class='preview-footer'>
        <button type='button' class='btn ghost' onclick='captureReceipt()'>📸 Chụp màn hình</button>
        <button type='button' class='btn ghost' onclick='printReceipt()'>🖨️ In phiếu</button>
        <button type='button' class='btn ghost' onclick='GM_ui.closeModal()'>Đóng</button>
      </div>
    `;

  GM_ui.modal(previewHTML, { title: `Xem trước phiếu ${receiptNumber}`, size: 'custom', style: 'width:1050px;min-width:900px;max-width:1200px;max-height:80vh;' });
  };

  // Test function for capture
  window.testCapture = function() {
    console.log('Test capture called');
    GM_ui.toast('🧪 Test capture function works!');
    if (window.captureReceipt) {
      window.captureReceipt();
    } else {
      console.error('captureReceipt not found');
    }
  };

  window.captureReceipt = async function() {
    const receiptElement = document.getElementById('receipt-preview');
    if (!receiptElement) {
      GM_ui.toast('❌ Không tìm thấy phiếu để chụp');
      return;
    }

    const ensureHtml2Canvas = () => new Promise((resolve, reject) => {
      if (window.html2canvas) return resolve();
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Không tải được html2canvas'));
      document.head.appendChild(s);
    });

    try {
      await ensureHtml2Canvas();
      const canvas = await window.html2canvas(receiptElement, {
        scale: Math.max(2, window.devicePixelRatio || 1),
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: receiptElement.scrollWidth,
        windowHeight: receiptElement.scrollHeight,
        logging: false
      });

      await new Promise((resolve, reject) => {
        canvas.toBlob(async (blob) => {
          try {
            if (blob && navigator.clipboard && window.ClipboardItem) {
              await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
              GM_ui.toast('✅ Đã chụp màn hình! Bấm Ctrl+V để dán');
              resolve();
            } else {
              reject(new Error('Clipboard API không hỗ trợ'));
            }
          } catch (e) {
            reject(e);
          }
        }, 'image/png', 0.95);
      });
    } catch (err) {
      console.error(err);
      GM_ui.toast('⚠️ Không thể chụp tự động. Hãy in hoặc chụp thủ công');
    }
  };

  window.printReceipt = function() {
    const receiptContent = document.getElementById('receipt-preview').innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>In phiếu xuất</title>
          <style>
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
            /* Force black text and white backgrounds for printing and in this window */
            *, *:before, *:after { color: #000 !important; background: #fff !important; box-shadow: none !important; text-shadow: none !important; }
            table, th, td { border-color: #000 !important; }
            h1, h2, h3, h4 { font-weight: 700 !important; }
            .preview-footer, .no-print { display: none !important; }
            @media print {
              body { margin: 0; }
              *, *:before, *:after { color: #000 !important; background: #fff !important; box-shadow: none !important; text-shadow: none !important; }
              table, th, td { border-color: #000 !important; }
              h1, h2, h3, h4 { font-weight: 700 !important; }
              .preview-footer, .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${receiptContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  window.submitExport = async function() {
    const customerName = document.getElementById('customer-name').value.trim();
    const customerType = (document.getElementById('customer-type')?.value || '').trim();
    const customerPhone = document.getElementById('customer-phone').value.trim();
    const customerAddress = document.getElementById('customer-address').value.trim();
    const exportDate = document.getElementById('export-date').value;
    const receiptNumber = document.getElementById('receipt-number').value;
    const prepaidAmount = parseFloat(document.getElementById('prepaid-amount').value) || 0;
    
    if (!customerName) {
      GM_ui.toast('Vui lòng nhập tên khách hàng');
      return;
    }
    
    if (!customerPhone) {
      GM_ui.toast('Vui lòng nhập số điện thoại');
      return;
    }
    
    if (!customerAddress) {
      GM_ui.toast('Vui lòng nhập địa chỉ');
      return;
    }

    const rows = document.querySelectorAll('#export-tbody tr');
    const items = [];
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const productCode = row.querySelector('.product-code').value.trim();
  const quantity = round2(row.querySelector('.quantity').value);
      const unit = row.querySelector('.unit').value;
      const price = parseFloat(row.querySelector('.price').value) || 0;
      const note = row.querySelector('.note').value.trim();
      
      if (!productCode) {
        GM_ui.toast(`Dòng ${i + 1}: Vui lòng nhập mã sản phẩm`);
        return;
      }
      
      if (quantity < 0) {
        GM_ui.toast(`Dòng ${i + 1}: Số lượng không được âm`);
        return;
      }
      
      if (!unit) {
        GM_ui.toast(`Dòng ${i + 1}: Vui lòng chọn đơn vị tính`);
        return;
      }

      if (price <= 0) {
        GM_ui.toast(`Dòng ${i + 1}: Giá tiền phải lớn hơn 0`);
        return;
      }

      let product = GM_products.list().find(p => p.code === productCode || p.id === productCode);
      if (!product) {
        GM_ui.toast(`Sản phẩm ${productCode} không tồn tại`);
        return;
      }

      items.push({
        productId: product.id,
        quantity: quantity,
        unit: normalizeUnit(unit),
        price: price,
        note: note
      });
    }

    if (items.length === 0) {
      GM_ui.toast('Vui lòng thêm ít nhất 1 sản phẩm');
      return;
    }

    // Lưu/cập nhật KH qua service để realtime
    try {
      if (window.GM_customers && GM_customers.create && GM_customers.update) {
        const existing = (GM_state.customers || []).find(c => c.phone === customerPhone);
        if (existing) {
          const needsUpdate = existing.name !== customerName || existing.address !== customerAddress || existing.type !== customerType;
          if (needsUpdate) {
            await GM_customers.update(existing.id, {
              name: customerName,
              phone: customerPhone,
              address: customerAddress,
              type: customerType,
              updatedAt: GM_utils.nowISO()
            });
          }
        } else {
          await GM_customers.create({
            name: customerName,
            phone: customerPhone,
            address: customerAddress,
            type: customerType,
            createdAt: GM_utils.nowISO()
          });
        }
      } else {
        // Fallback local nếu service chưa sẵn sàng
        if (!GM_state.customers) GM_state.customers = [];
        const existing = GM_state.customers.find(c => c.phone === customerPhone);
        if (!existing) {
          GM_state.customers.push({ id: GM_utils.uid(), name: customerName, phone: customerPhone, address: customerAddress, type: customerType, createdAt: GM_utils.nowISO() });
        }
      }
    } catch(e) { console.warn('Customer sync (create) failed', e); }

    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const exportData = {
      receiptCode: receiptNumber,
      date: exportDate,
      partnerName: customerName,
      partnerType: customerType,
      partnerPhone: customerPhone,
      partnerAddress: customerAddress,
      items: items,
      type: 'export',
      prepaidAmount: prepaidAmount,
      totalAmount: totalAmount,
      note: `Xuất kho cho ${customerName} - ${customerPhone}`
    };

    try {
      await GM_receipts.createExport(exportData);
      await GM_stateAPI.persistAll();
      GM_ui.toast(`✅ Đã xuất kho thành công - ${receiptNumber}`);
      clearSavedFormData();
      clearExportForm();
      setTimeout(() => { GM_router.go('exports'); }, 1000);
    } catch(error) {
      console.error('Lỗi xuất kho:', error);
      GM_ui.toast('❌ Có lỗi xảy ra khi xuất kho');
    }
  };

  function clearExportForm() {
    document.getElementById('customer-name').value = '';
    document.getElementById('customer-phone').value = '';
    document.getElementById('customer-address').value = '';
    document.getElementById('export-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('prepaid-amount').value = '0';
    updateReceiptNumber();
    
    const tbody = document.getElementById('export-tbody');
    tbody.innerHTML = `
      <tr>
        <td>1</td>
        <td><input class='input product-code' placeholder='Nhập mã SP' list='products-datalist' style='width:100%;' onchange='loadProductPrice(this)' /></td>
  <td><input class='input quantity' type='number' min='0' step='0.01' placeholder='SL' style='width:100%;' onchange='calculateRowTotal(this)' /></td>
        <td>
          <select class='input unit' style='width:100%;'>
            <option value=''>Chọn đơn vị</option>
            <option value='VNĐ/Thùng'>VNĐ/Thùng</option>
            <option value='VNĐ/m²'>VNĐ/m²</option>
          </select>
        </td>
        <td>
          <input class='input price' type='number' min='0' placeholder='Giá' style='width:100%;' oninput='updatePriceDisplay(this);calculateRowTotal(this)' />
          <div class='price-display' style='text-align:right;font-size:12px;color:#374151;opacity:.9;margin-top:2px;'>0</div>
        </td>
        <td>
          <input class='total' type='hidden' />
          <span class='total-display' style='display:inline-block;width:100%;background:#f8fafc;padding:6px 8px;border:1px solid var(--border);border-radius:6px;text-align:right;'>0</span>
        </td>
        <td><input class='input note' placeholder='Ghi chú' style='width:100%;' /></td>
        <td><button type='button' class='btn danger' style='padding:4px 8px;' onclick='removeExportRow(this)'>×</button></td>
      </tr>
    `;
    
    updateTotals();
  }
  
  // View export order details
  window.viewExportOrder = function(receiptId) {
    const receipt = GM_receipts.list('export').find(r => r.id === receiptId);
    if (!receipt) {
      GM_ui.toast('❌ Không tìm thấy phiếu xuất');
      return;
    }
    
  const totalQuantity = receipt.items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
    const finalAmount = (receipt.totalAmount || 0) - (receipt.prepaidAmount || 0);
    
    const orderHTML = `
  <div id='receipt-preview' style='background:white;font-family:Arial,sans-serif;padding:24px;'>
        <!-- Company Header -->
  <div style='text-align:center;border-bottom:3px solid #2563eb;padding-bottom:18px;margin-bottom:18px;'>
          <h1 style='margin:0;font-size:24px;font-weight:bold;color:#1e40af;text-transform:uppercase;letter-spacing:1px;'>CÔNG TY TNHH DV-TM NGUYEN KHAI</h1>
          <div style='margin-top:8px;font-size:14px;color:#64748b;line-height:1.5;'>
            <p>Địa chỉ: 107 Tam Bình, Phường Tam Phú, TP Thủ Đức</p>
            <p>MST: 0315811410</p>
            <p>Số điện thoại: 0902.484.755 - 0933.611.365</p>
          </div>
        </div>

        <!-- Receipt Title -->
  <div style='text-align:center;margin-bottom:18px;'>
          <h2 style='margin:0;font-size:20px;font-weight:bold;color:#dc2626;background:#fef2f2;border:2px solid #dc2626;'>PHIẾU XUẤT KHO</h2>
          <p style='margin:15px 0 0 0;font-size:16px;color:#374151;'>Số phiếu: <strong style='color:#2563eb;'>${receipt.receiptCode}</strong></p>
        </div>
        
        <!-- Customer Info Section -->
  <div style='background:#f8fafc;border-left:4px solid #3b82f6;padding:16px 18px;margin-bottom:18px;border-radius:8px;'>
          <h3 style='margin:0;color:#dc2626;font-size:16px;text-transform:uppercase;border-bottom:1px solid #e5e7eb;'>THÔNG TIN KHÁCH HÀNG</h3>
          <div style='display:grid;grid-template-columns:1fr 1fr;'>
            <div>
              <p style='margin:8px 0;color:#374151;'><strong>Tên:</strong> ${receipt.partnerName || ''}</p>
              <p style='margin:8px 0;color:#374151;'><strong>SĐT:</strong> ${receipt.partnerPhone || ''}</p>
            </div>
            <div>
              <p style='margin:8px 0;color:#374151;'><strong>Địa chỉ:</strong> ${receipt.partnerAddress || ''}</p>
              <p style='margin:8px 0;color:#374151;'><strong>Ngày xuất:</strong> ${GM_utils.formatDate(receipt.date)}</p>
              ${receipt.partnerType?`<p style='margin:8px 0;color:#374151;'><strong>Đối tượng:</strong> ${receipt.partnerType}</p>`:''}
            </div>
          </div>
        </div>
        
        <!-- Products Table -->
  <div style='margin-bottom:18px;'>
          <h3 style='margin:0 0 12px 0;color:#dc2626;font-size:16px;text-transform:uppercase;border-bottom:1px solid #e5e7eb;'>CHI TIẾT SẢN PHẨM XUẤT</h3>
          <table style='width:100%;border-collapse:separate;border-spacing:0 4px;background:#fff;'>
            <thead>
              <tr style='background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:white;'>
                <th style='border:1px solid #ddd;padding:15px 8px;text-align:center;font-weight:600;'>Ngày</th>
                <th style='border:1px solid #ddd;padding:15px 12px;text-align:left;font-weight:600;'>Mã sản phẩm</th>
                <th style='border:1px solid #ddd;padding:15px 12px;text-align:center;font-weight:600;'>Đơn vị</th>
                <th style='border:1px solid #ddd;padding:15px 12px;text-align:center;font-weight:600;'>Số lượng</th>
                <th style='border:1px solid #ddd;padding:15px 12px;text-align:right;font-weight:600;'>Đơn giá</th>
                <th style='border:1px solid #ddd;padding:15px 12px;text-align:right;font-weight:600;'>Thành Tiền</th>
                <th style='border:1px solid #ddd;padding:15px 12px;text-align:left;font-weight:600;'>Note</th>
              </tr>
            </thead>
            <tbody>
              ${receipt.items.map((item, index) => {
                const product = GM_products.list().find(p => p.id === item.productId);
                const itemTotal = item.quantity * item.price;
                const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
                return `
                  <tr style='background:${rowBg};transition:background-color 0.2s;' onmouseover='this.style.background="#e0f2fe"' onmouseout='this.style.background="${rowBg}"'>
                    <td style='border:1px solid #e5e7eb;padding:12px 8px;text-align:center;color:#64748b;'>${GM_utils.formatDate(receipt.date)}</td>
                    <td style='border:1px solid #e5e7eb;padding:12px;font-weight:600;color:#1e40af;'>${product?.code || 'N/A'}</td>
                    <td style='border:1px solid #e5e7eb;padding:12px;text-align:center;color:#64748b;'>${normalizeUnit(item.unit)}</td>
                    <td style='border:1px solid #e5e7eb;padding:12px;text-align:center;font-weight:600;color:#059669;'>${formatQty(item.quantity)}</td>
                    <td style='border:1px solid #e5e7eb;padding:12px;text-align:right;color:#374151;'>${GM_utils.formatMoney(item.price)}</td>
                    <td style='border:1px solid #e5e7eb;padding:12px;text-align:right;font-weight:700;color:#dc2626;'>${GM_utils.formatMoney(itemTotal)}</td>
                    <td style='border:1px solid #e5e7eb;padding:12px;color:#64748b;font-style:italic;'>${item.note || ''}</td>
                  </tr>
                `;
              }).join('')}
              <!-- Summary Rows: Deposit (Cọc) and Final Amount -->
              <tr style='background:#fef2f2;border-top:2px solid #dc2626;'>
                <td colspan='5' style='border:1px solid #e5e7eb;padding:15px;text-align:right;font-weight:bold;color:#dc2626;'>Cọc</td>
                <td style='border:1px solid #e5e7eb;padding:15px;text-align:right;font-weight:700;color:#dc2626;'>${GM_utils.formatMoney(receipt.prepaidAmount || 0)}</td>
                <td style='border:1px solid #e5e7eb;padding:15px;'></td>
              </tr>
              <tr style='background:#f0f9ff;'>
                <td colspan='5' style='border:1px solid #e5e7eb;padding:15px;text-align:right;font-weight:bold;color:#1e40af;'>Tổng tiền phải thu</td>
                <td style='border:1px solid #e5e7eb;padding:15px;text-align:right;font-weight:700;color:#1e40af;'>${GM_utils.formatMoney(finalAmount)}</td>
                <td style='border:1px solid #e5e7eb;padding:15px;'></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Removed signature and payment info sections per request -->

        <!-- Capture Success Message (Hidden by default) -->
        <div id='capture-success-message' style='display:none;position:absolute;top:20px;right:20px;background:#10b981;color:white;padding:12px 20px;border-radius:6px;box-shadow:0 4px 6px rgba(0,0,0,0.1);z-index:1000;'>
          <div style='display:flex;align-items:center;gap:8px;'>
            <span style='font-size:18px;'>✅</span>
            <span style='font-weight:600;'>Đã chụp màn hình thành công! Bấm Ctrl+V để dán</span>
          </div>
        </div>
      </div>
      
  <div style='text-align:center;border-top:1px solid #e5e7eb;padding-top:18px;margin-top:18px;'>
        <button type='button' class='btn primary' onclick='window.captureReceipt && window.captureReceipt()' style='margin-right:12px;padding:10px 20px;font-weight:600;'>📸 Chụp màn hình</button>
        <button type='button' class='btn ghost' onclick='window.testCapture && window.testCapture()' style='margin-right:12px;padding:8px 16px;font-size:12px;'>🧪 Test</button>
        <button type='button' class='btn ghost' onclick='printReceipt && printReceipt()' style='margin-right:12px;padding:10px 20px;'>🖨️ In phiếu</button>
        <button type='button' class='btn ghost' onclick='GM_ui.closeModal()' style='padding:10px 20px;'>❌ Đóng</button>
      </div>
    `;
    
  GM_ui.modal(orderHTML, { title: `Chi tiết đơn hàng - ${receipt.receiptCode}`, size: 'custom', style: 'width:1050px;min-width:900px;max-width:1200px;max-height:80vh;' });
    
    // Ensure captureReceipt is available after modal is created
    setTimeout(() => {
      const captureBtn = document.querySelector('button[onclick*="captureReceipt"]');
      if (captureBtn) {
        console.log('Capture button found:', captureBtn);
        // Add additional click listener as backup
        captureBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          console.log('Capture button clicked via event listener');
          if (window.captureReceipt) {
            window.captureReceipt();
          } else {
            console.error('captureReceipt function not found');
          }
        });
      } else {
        console.error('Capture button not found in DOM');
      }
    }, 100);
  };
})();