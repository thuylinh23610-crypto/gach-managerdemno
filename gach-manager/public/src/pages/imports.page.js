(function(){
  // Đăng ký route
  GM_router.register('imports', renderImportsPage);
  function round2(n){ const v=parseFloat(n); if(isNaN(v)) return 0; return Math.round((v+Number.EPSILON)*100)/100; }
  function formatQty(n){ const v=round2(n); return v.toLocaleString('vi-VN',{minimumFractionDigits:0,maximumFractionDigits:2}); }
  function onQtyChange(el){ const v=round2(el.value); el.value=v; }
  
  // Hàm cập nhật số phiếu nhập
  function updateReceiptNumber(receiptNumber) {
    const input = document.getElementById('receipt-number');
    if (input) input.value = receiptNumber;
  }

    // Hàm xóa phiếu nhập
  async function deleteImportReceipt(id) {
    const receipt = GM_receipts.list('import').find(r => r.id === id);
    if (!receipt) {
      GM_ui.toast('❌ Không tìm thấy phiếu nhập');
      return;
    }
    
    const confirmed = await GM_ui.confirmBox(`Bạn có chắc muốn xóa phiếu nhập ${receipt.receiptCode}?<br><br>⚠️ <strong>Lưu ý:</strong> Xóa phiếu này sẽ tự động cập nhật lại tồn kho!`);
    if (!confirmed) return;
    
    try {
      await GM_receipts.delete(id);
      GM_ui.toast('✔ Đã xóa phiếu nhập ' + receipt.receiptCode);
      GM_router.go('imports');
    } catch (err) {
      GM_ui.toast('❌ ' + err.message);
    }
  }

    // Hàm sửa phiếu nhập
  function editImportReceipt(id) {
    const receipt = GM_receipts.list('import').find(r => r.id === id);
    if (!receipt) {
      GM_ui.toast('❌ Không tìm thấy phiếu nhập');
      return;
    }
    // Hiển thị modal chỉnh sửa phiếu nhập
    const items = receipt.items?.map(item => {
      const product = GM_products.list().find(p => p.id === item.productId) || {};
      return {
        ...item,
        productName: product.name || '',
        productCode: product.code || ''
      };
    }) || [];
    const editHTML = `
      <div style='max-height:60vh;overflow:auto;'>
        <h2 style='margin:0 0 18px 0;font-size:18px;font-weight:bold;text-align:center;'>Sửa phiếu nhập kho</h2>
        <form id='edit-receipt-form'>
          <div style='display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px;'>
            <div>
              <label>Đơn vị vận chuyển</label>
              <input class='input' name='partnerName' value='${receipt.partnerName || ''}' style='width:100%;margin-top:4px;' />
            </div>
            <div>
              <label>Ngày nhập</label>
              <input class='input' name='date' type='date' value='${receipt.date || ''}' style='width:100%;margin-top:4px;' />
            </div>
          </div>
          <div style='margin-bottom:18px;'>
            <label>Ghi chú</label>
            <input class='input' name='note' value='${receipt.note || ''}' style='width:100%;margin-top:4px;' />
          </div>
          <div style='margin-bottom:18px;'>
            <h4 style='margin:0 0 10px 0;'>Chi tiết sản phẩm</h4>
            <div class='table-wrap' style='max-height:300px;overflow:auto;'>
              <table class='table' style='width:100%;table-layout:fixed;'>
                <thead>
                  <tr>
                    <th style='width:50px;text-align:center;'>#</th>
                    <th style='text-align:left;'>Mã SP</th>
                    <th style='text-align:right;'>Số lượng</th>
                    <th style='text-align:left;'>Đơn vị</th>
                    <th style='text-align:left;'>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map((item, idx) => `
                    <tr>
                      <td style='text-align:center;'>${idx + 1}</td>
                      <td><input class='input' name='productCode' value='${item.productCode}' style='width:100%;' /></td>
                      <td><input class='input' name='quantity' type='number' min='0' step='0.01' value='${item.quantity}' style='width:100%;text-align:right;' onchange='onQtyChange(this)' /></td>
                      <td><input class='input' name='unit' value='${item.unit}' style='width:100%;' /></td>
                      <td><input class='input' name='note' value='${item.note || ''}' style='width:100%;' /></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
          <div style='text-align:right;margin-top:18px;'>
            <button type='button' class='btn ghost' onclick='GM_ui.closeModal()'>Hủy</button>
            <button type='submit' class='btn' style='margin-left:12px;'>Lưu thay đổi</button>
          </div>
        </form>
      </div>
    `;
  GM_ui.modal(editHTML, { title: `Sửa phiếu nhập kho - ${receipt.receiptCode}`, size: 'custom', style: 'width:700px;min-width:600px;max-width:800px;max-height:80vh;' });
    // Xử lý submit form cập nhật phiếu
    setTimeout(() => {
      const form = document.getElementById('edit-receipt-form');
      if (form) {
        form.onsubmit = function(e) {
          e.preventDefault();
          // Lấy dữ liệu mới
          const fd = new FormData(form);
          receipt.partnerName = fd.get('partnerName');
          receipt.date = fd.get('date');
          receipt.note = fd.get('note');
          // Cập nhật từng sản phẩm
          const trs = form.querySelectorAll('tbody tr');
          receipt.items = Array.from(trs).map(tr => ({
            productId: null, // Giữ nguyên id cũ nếu cần
            productCode: tr.querySelector('input[name="productCode"]').value,
            quantity: tr.querySelector('input[name="quantity"]').value,
            unit: tr.querySelector('input[name="unit"]').value,
            note: tr.querySelector('input[name="note"]').value
          }));
          // Lưu lại vào local
          GM_receipts.update(receipt.id, receipt);
          GM_ui.toast('✔ Đã cập nhật phiếu nhập');
          GM_ui.closeModal();
          GM_router.go('imports');
        };
      }
    }, 200);
  }

  function renderImportsPage(root){
    console.log('Rendering imports page...');
    const nextReceiptNumber = getNextReceiptNumber();
    console.log('Next receipt number:', nextReceiptNumber);
    const currentDate = new Date().toISOString().split('T')[0];
    
    root.innerHTML = `
      <div class='page-head'>
        <h2>🛬 Nhập kho</h2>
      </div>
      <div class='card' style='max-width:100%;margin:0 auto 32px auto;padding:24px 18px 18px 18px;box-shadow:0 2px 12px #0001;'>
        <h3 style='margin-top:0;font-size:20px;color:var(--text);text-align:center;'>📝 Phiếu nhập kho</h3>
        <div class='grid' style='grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px 32px;margin-bottom:28px;'>
          <div>
            <label style='font-weight:500;color:var(--text);font-size:15px;display:block;margin-bottom:6px;'>🚚 Đơn vị vận chuyển</label>
            <input id='transport-unit' class='input' placeholder='Nhập tên đơn vị vận chuyển' />
          </div>
          <div>
            <label style='font-weight:500;color:var(--text);font-size:15px;display:block;margin-bottom:6px;'>📅 Ngày nhập</label>
            <input id='import-date' type='date' class='input' value='${currentDate}' />
          </div>
          <div>
            <label style='font-weight:500;color:var(--text);font-size:15px;display:block;margin-bottom:6px;'>📋 Số phiếu nhập</label>
            <input id='receipt-number' class='input' value='${nextReceiptNumber}' readonly style='background:#f8fafc;' />
          </div>
        </div>
        <div style='margin-bottom:18px;'>
          <label style='font-weight:500;color:var(--text);font-size:16px;display:block;margin-bottom:12px;'>📦 Thông tin sản phẩm nhập</label>
              <div class='table-wrap' style='overflow-x:auto; min-width:900px;'>
                <table class='table' id='import-products-table' style='width:100%; min-width:900px;'>
              <thead>
                <tr>
                  <th style='width:50px;text-align:center;'>#</th>
                  <th style='width:200px;text-align:left;'>Mã sản phẩm</th>
                  <th style='width:120px;text-align:right;'>Số lượng</th>
                  <th style='width:140px;text-align:center;'>Đơn vị tính</th>
                  <th style='width:180px;text-align:left;'>Ghi chú</th>
                  <th style='width:50px;text-align:center;'>Xóa</th>
                </tr>
              </thead>
              <tbody id='import-tbody'>
                <tr>
                  <td style='text-align:center;'>1</td>
                  <td><input class='input product-code' placeholder='Nhập mã sản phẩm' list='products-datalist' style='width:100%;' onchange='loadProductUnit(this)' /></td>
                  <td><input class='input quantity' type='number' min='0' step='0.01' placeholder='Số lượng' style='width:100%;text-align:right;' onchange='onQtyChange(this)' /></td>
                  <td>
                    <select class='input unit' style='width:100%;'>
                      <option value=''>Chọn đơn vị</option>
                      <option value='Viên'>Viên</option>
                      <option value='Hộp'>Hộp</option>
                      <option value='Thùng'>Thùng</option>
                      <option value='m²'>m²</option>
                    </select>
                  </td>
                  <td><input class='input note' placeholder='Ghi chú' style='width:100%;' /></td>
                  <td style='text-align:center;'><button type='button' class='btn danger' style='padding:4px 8px;' onclick='removeRow(this)'>×</button></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style='margin-top:14px;display:flex;gap:14px;'>
            <button type='button' class='btn ghost' onclick='addProductRow()'>➕ Thêm dòng</button>
          </div>
        </div>
        <div style='text-align:right;padding-top:18px;border-top:1px solid var(--border);margin-top:18px;'>
          <button class='btn ghost' onclick='openBulkImport()' style='margin-right:14px;'>📂 Nhập kho hàng loạt</button>
          <button class='btn' onclick='submitImport()'>✅ Nhập kho</button>
        </div>
      </div>
      <div id='import-history' style='margin-top:28px;'>
        ${renderImportHistory()}
      </div>
      <datalist id='products-datalist'>
        ${GM_products.list().map(p => `<option value='${p.code || p.id}'>${p.code || p.id} - ${p.name || ''}</option>`).join('')}
      </datalist>
    `;
    bindImportEvents();
  }
  
  function getNextReceiptNumber() {
    const imports = GM_receipts.list('import') || [];
    const lastNumber = imports.length > 0 ? 
      Math.max(...imports.map(r => {
        if (!r || !r.receiptCode) return 0;
        const match = r.receiptCode.match(/PN(\d+)/);
        return match ? parseInt(match[1]) : 0;
      })) : 0;
    return `PN${String(lastNumber + 1).padStart(3, '0')}`;
  }

    function renderImportHistory() {
    // Lọc bỏ các phiếu nhập lỗi (không có receiptCode hợp lệ)
    const imports = GM_receipts.list('import')
      .filter(imp => imp.receiptCode && imp.receiptCode !== 'undefined' && imp.receiptCode.match(/^PN\d+$/))
      .slice().reverse().slice(0, 15);
      
    if (!imports.length) {
      return `
        <div class='card'>
          <h3 style='margin-top:0;font-size:16px;color:var(--muted);'>📋 Lịch sử nhập kho</h3>
          <div class='empty' style='padding:30px;text-align:center;'>
            <p style='color:var(--muted);font-size:15px;'>Chưa có phiếu nhập nào</p>
          </div>
        </div>
      `;
    }

    return `
      <div class='card'>
        <div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;'>
          <h3 style='margin:0;font-size:17px;color:var(--text);'>📋 Lịch sử nhập kho (${imports.length} gần nhất)</h3>
          <span style='font-size:13px;color:var(--muted);'>Tổng: ${imports.reduce((sum, imp) => sum + (imp.items?.length || 0), 0)} sản phẩm</span>
        </div>
        
        <div style='max-height:500px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;'>
          <table class='table' style='margin:0;'>
            <thead style='position:sticky;top:0;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);color:white;z-index:10;'>
              <tr>
                <th style='padding:12px 8px;font-size:13px;border:none;'>Số phiếu</th>
                <th style='padding:12px 8px;font-size:13px;border:none;'>Ngày nhập</th>
                <th style='padding:12px 8px;font-size:13px;border:none;'>Đơn vị VC</th>
                <th style='padding:12px 8px;font-size:13px;border:none;text-align:center;'>SP</th>
                <th style='padding:12px 8px;font-size:13px;border:none;text-align:center;'>SL</th>
                <th style='padding:12px 8px;font-size:13px;border:none;width:160px;'>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              ${imports.map((imp, idx) => {
                const totalQty = imp.items?.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0) || 0;
                const bgColor = idx % 2 === 0 ? '#f9fafb' : 'white';
                return `
                  <tr style='background:${bgColor};transition:all 0.2s;' onmouseover='this.style.background="#e0f2fe"' onmouseout='this.style.background="${bgColor}"'>
                    <td style='padding:10px 8px;border-bottom:1px solid var(--border);'>
                      <span style='font-weight:600;color:#667eea;font-size:14px;'>${imp.receiptCode}</span>
                    </td>
                    <td style='padding:10px 8px;border-bottom:1px solid var(--border);font-size:13px;color:#64748b;'>
                      ${GM_utils.formatDate(imp.date)}
                    </td>
                    <td style='padding:10px 8px;border-bottom:1px solid var(--border);font-size:13px;'>
                      <span style='background:#f1f5f9;padding:4px 8px;border-radius:4px;font-size:12px;'>${imp.partnerName || 'Không có'}</span>
                    </td>
                    <td style='padding:10px 8px;border-bottom:1px solid var(--border);text-align:center;'>
                      <span style='background:#dbeafe;color:#1e40af;padding:3px 8px;border-radius:12px;font-size:12px;font-weight:600;'>${imp.items?.length || 0}</span>
                    </td>
                    <td style='padding:10px 8px;border-bottom:1px solid var(--border);text-align:center;'>
                      <span style='background:#fef3c7;color:#92400e;padding:3px 8px;border-radius:12px;font-size:12px;font-weight:600;'>${totalQty}</span>
                    </td>
                    <td style='padding:10px 8px;border-bottom:1px solid var(--border);'>
                      <div style='display:flex;gap:6px;justify-content:flex-start;'>
                        <button class='btn ghost' style='padding:6px 10px;font-size:12px;' onclick='viewImportOrder("${imp.id}")' title='Xem chi tiết'>
                          👁️
                        </button>
                        <button class='btn ghost' style='padding:6px 10px;font-size:12px;' onclick='editImportReceipt("${imp.id}")' title='Sửa phiếu'>
                          ✏️
                        </button>
                        <button class='btn danger ghost' style='padding:6px 10px;font-size:12px;' onclick='deleteImportReceipt("${imp.id}")' title='Xóa phiếu'>
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        
        <div style='margin-top:12px;padding:12px;background:#f8fafc;border-radius:6px;display:flex;justify-content:space-between;align-items:center;'>
          <span style='font-size:13px;color:#64748b;'>
            💡 <strong>Mẹo:</strong> Click vào phiếu để xem chi tiết
          </span>
          <span style='font-size:13px;color:#64748b;'>
            Tổng phiếu nhập: <strong style='color:#667eea;'>${imports.length}</strong>
          </span>
        </div>
      </div>
    `;
  }

    function bindImportEvents() {
    const receiptInput = document.getElementById('receipt-number');
    if (receiptInput) {
      receiptInput.value = getNextReceiptNumber();
    }
    
    // Tự động xóa các phiếu nhập lỗi
    cleanInvalidReceipts();
    
    // Auto-save functionality
    setTimeout(() => {
      setupImportAutoSave();
      loadSavedImportData();
    }, 100);
  }
  
  // Hàm xóa các phiếu nhập lỗi
  async function cleanInvalidReceipts() {
    const imports = GM_receipts.list('import');
    let cleaned = 0;
    
    for (const receipt of imports) {
      // Xóa phiếu không có receiptCode hợp lệ
      if (!receipt.receiptCode || receipt.receiptCode === 'undefined' || !receipt.receiptCode.match(/^PN\d+$/)) {
        try {
          await GM_receipts.delete(receipt.id);
          cleaned++;
        } catch (err) {
          console.error('Lỗi xóa phiếu lỗi:', err);
        }
      }
    }
    
    if (cleaned > 0) {
      await GM_stateAPI.persistAll();
      console.log(`Đã xóa ${cleaned} phiếu nhập lỗi`);
    }
  }
  
  // Auto-save form data to prevent data loss
  function setupImportAutoSave() {
    const fieldsToSave = ['transport-unit', 'import-date'];
    
    fieldsToSave.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.addEventListener('input', saveImportFormData);
        field.addEventListener('change', saveImportFormData);
      }
    });
    
    // Save table data on any change
    const table = document.getElementById('import-products-table');
    if (table) {
      table.addEventListener('input', saveImportTableData);
      table.addEventListener('change', saveImportTableData);
    }
  }
  
  function saveImportFormData() {
    const formData = {
      transportUnit: document.getElementById('transport-unit')?.value || '',
      importDate: document.getElementById('import-date')?.value || '',
      timestamp: Date.now()
    };
    
    localStorage.setItem('import_form_data', JSON.stringify(formData));
  }
  
  function saveImportTableData() {
    const rows = document.querySelectorAll('#import-tbody tr');
    const tableData = [];
    
    rows.forEach(row => {
      const productCode = row.querySelector('.product-code')?.value || '';
      const quantity = row.querySelector('.quantity')?.value || '';
      const unit = row.querySelector('.unit')?.value || '';
      const note = row.querySelector('.note')?.value || '';
      
      if (productCode || quantity || unit || note) {
        tableData.push({
          productCode,
          quantity,
          unit,
          note
        });
      }
    });
    
    localStorage.setItem('import_table_data', JSON.stringify(tableData));
  }
  
  function loadSavedImportData() {
    try {
      const savedFormData = localStorage.getItem('import_form_data');
      const savedTableData = localStorage.getItem('import_table_data');
      const restoredThisSession = sessionStorage.getItem('import_restored');
      
      if (savedFormData) {
        const formData = JSON.parse(savedFormData);
        const timeDiff = Date.now() - (formData.timestamp || 0);
        
        // Only restore if data is less than 1 hour old
        if (timeDiff < 3600000) {
          document.getElementById('transport-unit').value = formData.transportUnit || '';
          document.getElementById('import-date').value = formData.importDate || '';
          
          // Toast ONLY once per session
          if (!restoredThisSession && formData.transportUnit) {
            GM_ui.toast('📋 Đã khôi phục thông tin form nhập kho');
            sessionStorage.setItem('import_restored', 'true');
          }
        }
      }
      
      if (savedTableData) {
        const tableData = JSON.parse(savedTableData);
        if (tableData.length > 0) {
          restoreImportTableData(tableData);
          // Toast ONLY once per session
          if (!restoredThisSession && tableData.length > 0) {
            GM_ui.toast('📦 Đã khôi phục danh sách sản phẩm nhập');
            sessionStorage.setItem('import_restored', 'true');
          }
        }
      }
    } catch (error) {
      console.error('Error loading saved import data:', error);
    }
  }
  
  function restoreImportTableData(tableData) {
    const tbody = document.getElementById('import-tbody');
    tbody.innerHTML = '';
    
    tableData.forEach((rowData, index) => {
      const normalizedUnit = String(rowData.unit || '').replace(/^\s*VND\//i, '').trim();
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${index + 1}</td>
        <td><input class='input product-code' placeholder='Nhập mã sản phẩm' list='products-datalist' style='width:100%;' value='${rowData.productCode}' onchange='loadProductUnit(this)' /></td>
  <td><input class='input quantity' type='number' min='0' step='0.01' placeholder='Số lượng' style='width:100%;' value='${rowData.quantity}' onchange='onQtyChange(this)' /></td>
        <td>
          <select class='input unit' style='width:100%;'>
            <option value=''>Chọn đơn vị</option>
            <option value='Viên' ${normalizedUnit === 'Viên' ? 'selected' : ''}>Viên</option>
            <option value='Hộp' ${normalizedUnit === 'Hộp' ? 'selected' : ''}>Hộp</option>
            <option value='Thùng' ${normalizedUnit === 'Thùng' ? 'selected' : ''}>Thùng</option>
            <option value='m²' ${normalizedUnit === 'm²' ? 'selected' : ''}>m²</option>
          </select>
        </td>
        <td><input class='input note' placeholder='Ghi chú' style='width:100%;' value='${rowData.note}' /></td>
        <td><button type='button' class='btn danger' style='padding:4px 8px;' onclick='removeRow(this)'>×</button></td>
      `;
      tbody.appendChild(row);
    });
    
    // Add at least one empty row if none exist
    if (tableData.length === 0) {
      addProductRow();
    }
  }
  
  function clearSavedImportData() {
    localStorage.removeItem('import_form_data');
    localStorage.removeItem('import_table_data');
  }
  
  // Auto-fill product unit when product code is selected
  window.loadProductUnit = function(input) {
    const productCode = input.value.trim();
    if (!productCode) return;
    
    const product = GM_products.list().find(p => p.code === productCode || p.id === productCode);
    if (product && product.unit) {
      const row = input.closest('tr');
      const unitSelect = row.querySelector('.unit');
      
      if (unitSelect && !unitSelect.value) {
        const normalizedUnit = String(product.unit).replace(/^\s*VND\//i, '').trim();
        // Set the unit if it matches one of the options
        const options = Array.from(unitSelect.options);
        const matchingOption = options.find(option => 
          option.value === normalizedUnit || 
          option.value.toLowerCase() === normalizedUnit.toLowerCase()
        );
        
        if (matchingOption) {
          unitSelect.value = matchingOption.value;
        } else {
          // If unit doesn't match existing options, add it as a new option
          const newOption = document.createElement('option');
          newOption.value = normalizedUnit;
          newOption.textContent = normalizedUnit;
          unitSelect.appendChild(newOption);
          unitSelect.value = normalizedUnit;
        }
      }
    }
  };

    // Bulk import from Excel
  window.openBulkImport = function() {
    const modalHTML = `
  <div style="display:flex;flex-direction:column;max-height:70vh;overflow:auto;">
        <div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #e5e7eb;flex-shrink:0;'>
          <h3 style='margin:0;color:var(--text);font-size:22px;font-weight:700;'>📂 Nhập kho hàng loạt từ Excel</h3>
        </div>
  <div style='flex:1;overflow-y:auto;padding-right:8px;min-height:0;'>
          <div style='background:#e0f2fe;padding:18px 20px;border-radius:10px;margin-bottom:24px;border-left:5px solid #0ea5e9;'>
            <h4 style='margin:0 0 14px 0;color:#0369a1;display:flex;align-items:center;gap:8px;font-size:16px;'>
              📋 Template đơn giản - Chỉ cần 2 cột!
              <button class='btn ghost' onclick='downloadTemplate()' style='padding:4px 14px;font-size:13px;margin-left:auto;'>📥 Tải template</button>
            </h4>
            <div style='background:white;padding:14px;border-radius:8px;border:1.5px solid #bae6fd;'>
              <table style='width:100%;border-collapse:collapse;font-size:15px;min-width:400px;'>
                <thead>
                  <tr style='background:#f0f9ff;'>
                    <th style='border:1px solid #0ea5e9;padding:10px 12px;text-align:center;color:#0369a1;font-weight:700;'>A</th>
                    <th style='border:1px solid #0ea5e9;padding:10px 12px;text-align:center;color:#0369a1;font-weight:700;'>B</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style='background:#fefefe;'>
                    <td style='border:1px solid #e0e7ff;padding:10px 12px;text-align:center;font-weight:600;'>Mã sản phẩm</td>
                    <td style='border:1px solid #e0e7ff;padding:10px 12px;text-align:center;font-weight:600;'>Số lượng</td>
                  </tr>
                  <tr style='color:#64748b;font-style:italic;'>
                    <td style='border:1px solid #e0e7ff;padding:10px 12px;text-align:center;'>SP001</td>
                    <td style='border:1px solid #e0e7ff;padding:10px 12px;text-align:center;'>100</td>
                  </tr>
                  <tr style='color:#64748b;font-style:italic;'>
                    <td style='border:1px solid #e0e7ff;padding:10px 12px;text-align:center;'>SP002</td>
                    <td style='border:1px solid #e0e7ff;padding:10px 12px;text-align:center;'>50</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p style='margin:14px 0 0 0;font-size:14px;color:#0369a1;'>
              <strong>✨ Thông tin khác tự động điền:</strong> Đơn vị tính, tên sản phẩm từ database sản phẩm có sẵn
            </p>
          </div>
          <div style='background:#fef3cd;border:1.5px solid #f59e0b;border-radius:8px;padding:14px 18px;margin-bottom:24px;'>
            <h4 style='margin:0 0 10px 0;color:#92400e;font-size:15px;'>📋 Định dạng Excel chi tiết (tùy chọn):</h4>
            <ul style='margin:0;padding-left:22px;color:#78716c;font-size:14px;'>
              <li>Cột A: <strong>Mã sản phẩm</strong> (bắt buộc) - Phải là mã duy nhất, chỉ chứa chữ, số và dấu gạch ngang</li>
              <li>Cột B: <strong>Số lượng</strong> (bắt buộc) - Phải là số dương</li>
              <li>Cột C: <strong>Đơn vị vận chuyển</strong> (tùy chọn)</li>
              <li>Cột D: <strong>Ngày nhập</strong> (tùy chọn, để trống sẽ dùng ngày hiện tại)</li>
              <li>Cột E: <strong>Ghi chú</strong> (tùy chọn)</li>
            </ul>
            <div style='margin-top:14px;padding:10px 14px;background:#fef9c3;border:1.5px solid #eab308;border-radius:6px;'>
              <p style='margin:0;color:#854d0e;font-size:13px;'>
                <strong>💡 Lưu ý:</strong>
                <ul style='margin:4px 0 0 0;padding-left:20px;'>
                  <li>Nếu sản phẩm chưa tồn tại, hệ thống sẽ tự tạo mới</li>
                  <li>Đơn vị tính sẽ lấy từ thông tin sản phẩm hoặc mặc định là "Cái"</li>
                  <li>Mỗi dòng sẽ tạo một phiếu nhập riêng</li>
                  <li>File Excel phải đúng định dạng .xlsx hoặc .xls</li>
                </ul>
              </p>
            </div>
          </div>
          <div style='margin-bottom:22px;'>
            <label style='display:block;margin-bottom:10px;font-weight:500;color:var(--text);font-size:15px;'>📄 Chọn file Excel:</label>
            <input type='file' id='excel-file-input' accept='.xlsx,.xls' 
                   style='display:block;width:100%;padding:14px;border:2px dashed #d1d5db;border-radius:10px;background:#f9fafb;cursor:pointer;font-size:15px;' />
            <div id='import-error-message' style='display:none;margin-top:10px;padding:10px 14px;background:#fee2e2;border:1.5px solid #ef4444;border-radius:8px;color:#b91c1c;font-size:15px;'></div>
          </div>
        </div>
        <div style='display:flex;gap:16px;justify-content:flex-end;padding-top:18px;border-top:2px solid #e5e7eb;margin-top:18px;flex-shrink:0;'>
          <button type='button' class='btn ghost' onclick='GM_ui.closeModal()'>❌ Hủy</button>
          <button type='button' class='btn' onclick='processBulkImport()'>📂 Xử lý file</button>
        </div>
      </div>
    `;
  GM_ui.modal(modalHTML, { title: 'Nhập kho hàng loạt từ Excel', size: 'custom', style: 'width:700px;min-width:600px;max-width:800px;max-height:80vh;' });
  };

  // Download Excel template
  window.downloadTemplate = function() {
    try {
      // Create simple template data
      const templateData = [
        ['Mã sản phẩm', 'Số lượng'],
        ['SP001', 100],
        ['SP002', 50],
        ['SP003', 25]
      ];
      
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(templateData);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 15 }, // Mã sản phẩm
        { wch: 12 }  // Số lượng
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
      
      XLSX.utils.book_append_sheet(wb, ws, 'Template Nhập Kho');
      
      // Download file
      XLSX.writeFile(wb, `Template_Nhap_Kho_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      GM_ui.toast('✅ Đã tải template Excel thành công!');
      
    } catch (error) {
      console.error('Template download error:', error);
      GM_ui.toast('❌ Lỗi tải template. Đang tải SheetJS...');
      
      // Load SheetJS if not available
      if (typeof XLSX === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        document.head.appendChild(script);
        
        script.onload = () => {
          GM_ui.toast('✅ Đã tải SheetJS. Hãy thử tải template lại');
        };
      }
    }
  };

  // Process bulk import Excel file
  window.processBulkImport = async function() {
    const fileInput = document.getElementById('excel-file-input');
    const errorMessageDiv = document.getElementById('import-error-message');
    const file = fileInput?.files[0];
    
    // Reset error message
    errorMessageDiv.style.display = 'none';
    errorMessageDiv.textContent = '';
    
    if (!file) {
      errorMessageDiv.style.display = 'block';
      errorMessageDiv.textContent = 'Vui lòng chọn file Excel để xử lý';
      return;
    }

    try {
      const processingHTML = `
        <div class="gm-processing-overlay" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">
          <div style="background:white;padding:24px 32px;border-radius:12px;text-align:center;min-width:380px;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
            <div class="loading-spinner" style="margin:0 auto 16px;"></div>
            <div style="margin-bottom:8px;font-size:18px;color:#111827;font-weight:600;">🔄 Đang xử lý file Excel...</div>
            <div style="margin-top:16px;background:#f3f4f6;border-radius:8px;height:8px;overflow:hidden;">
              <div id="gm-progress-bar" style="background:linear-gradient(90deg,#10b981,#059669);height:100%;width:0%;transition:width 0.3s;"></div>
            </div>
            <div id="gm-progress-text" style="margin-top:8px;font-size:13px;color:#6b7280;font-weight:500;">0/0</div>
          </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', processingHTML);

        const arrayBuffer = await file.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);

        // Use SheetJS to read Excel
        if (typeof XLSX === 'undefined') {
          // Load SheetJS library if not available
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
          document.head.appendChild(script);

          await new Promise((resolve) => {
            script.onload = resolve;
          });
        }

        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        // Remove header row if exists
        const dataRows = jsonData.slice(1).filter(row => row.length > 0);

        if (dataRows.length === 0) {
          document.querySelector('.gm-processing-overlay')?.remove();
          errorMessageDiv.textContent = '⚠️ Không tìm thấy dữ liệu trong file Excel';
          errorMessageDiv.style.display = 'block';
          return;
        }

                // Đặt thông tin chung mặc định
        let transportUnit = 'Vận chuyển';
        let importDate = new Date().toISOString().split('T')[0];

        let products = [];
        let results = [];
        const total = dataRows.length;
        const bar = document.getElementById('gm-progress-bar');
        const txt = document.getElementById('gm-progress-text');
        if (txt) txt.textContent = `0/${total}`;

        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i];
          const rowNum = i + 2;
          let productCode, quantity, unit, note;
          let rowTransport = transportUnit;
          let rowDate = importDate;

                    // Simple format: Col A = Mã SP, Col B = Số lượng
          productCode = row[0]?.toString().trim() || '';
          quantity = parseFloat(row[1]) || 0;
          note = '';
          
          // Tự động lấy đơn vị từ sản phẩm có sẵn (nếu có)
          const existingProduct = GM_products.list().find(p => p.code === productCode || p.id === productCode);
          unit = existingProduct?.unit || 'Cái';
          
          // Debug log
          console.log(`Dòng ${i + 2}: Mã=${productCode}, SL=${quantity}, ĐV=${unit}`);

                    // Validate
          let error = '';
          if (!productCode) {
            error = 'Thiếu mã sản phẩm';
          } else if (quantity < 0 || isNaN(quantity)) {
            error = `Số lượng không hợp lệ: ${row[1]}`;
          }

          if (error) {
            results.push({ productCode, quantity, unit, note, status: 'fail', error });
            // Update progress
            const processed = i + 1;
            if (bar) bar.style.width = `${Math.round(processed/total*100)}%`;
            if (txt) txt.textContent = `${processed}/${total}`;
            continue;
          }

          // Auto-create product nếu chưa có
          let product = GM_products.list().find(p => p.code === productCode || p.id === productCode);
          if (!product) {
            await GM_products.create({
              code: productCode,
              name: `Sản phẩm ${productCode}`,
              unit: unit || 'Cái',
              price: 0
            });
          }

          products.push({ productCode, quantity, unit, note });
          results.push({ productCode, quantity, unit, note, status: 'success' });
          
          // Update progress
          const processed = i + 1;
          if (bar) bar.style.width = `${Math.round(processed/total*100)}%`;
          if (txt) txt.textContent = `${processed}/${total}`;
        }

        // Nếu có ít nhất 1 sản phẩm hợp lệ thì tạo phiếu nhập
        let importSuccess = false;
        let receiptNumber = '';
        if (products.length > 0) {
          receiptNumber = getNextReceiptNumber();
          const importData = {
            transportUnit,
            importDate,
            receiptNumber,
            products
          };
          importSuccess = await submitImportData(importData);
        }

        // LUÔN LUÔN remove overlay trước
        document.querySelector('.gm-processing-overlay')?.remove();

        // Đếm kết quả
        const successCount = results.filter(r=>r.status==='success').length;
        const failCount = results.filter(r=>r.status==='fail').length;

        console.log('[BulkImport] Import done:', { importSuccess, successCount, failCount, products: products.length });

        // Nếu thành công: đóng modal và thông báo rõ ràng, không giữ bảng kết quả
        if (importSuccess && successCount > 0) {
          // Clear error message div
          if (errorMessageDiv) {
            errorMessageDiv.style.display = 'none';
            errorMessageDiv.innerHTML = '';
          }
          
          console.log('[BulkImport] Closing modal and showing toast...');
          
          // Close modal immediately
          GM_ui.closeModal();
          
          // Show beautiful success toast
          GM_ui.toast(`✅ Nhập kho ${successCount} sản phẩm thành công!`, { type: 'success', timeout: 4000 });
          if (failCount > 0) GM_ui.toast(`⚠️ Bỏ qua ${failCount} dòng lỗi`, { type: 'warning', timeout: 4000 });
          
          // Soft refresh imports page
          setTimeout(() => {
            console.log('[BulkImport] Refreshing page...');
            GM_router.go('imports');
          }, 300);
          return;
        }

  // Nếu không thành công: hiển thị chi tiết để người dùng xem và sửa
  let html = `
          <div style='display:flex;flex-direction:column;height:100%;'>
            <div style='background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);color:white;padding:16px;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;'>
              <h4 style='margin:0;font-size:16px;'>📊 Kết quả import phiếu nhập ${receiptNumber ? `<span style='background:white;color:#667eea;padding:4px 12px;border-radius:16px;font-weight:bold;margin-left:8px;'>${receiptNumber}</span>` : ''}</h4>
              <button onclick='GM_ui.closeModal()' class='btn ghost' style='background:rgba(255,255,255,0.2);color:white;border:1px solid rgba(255,255,255,0.3);padding:6px 14px;font-size:14px;font-weight:600;' onmouseover='this.style.background="rgba(255,255,255,0.3)"' onmouseout='this.style.background="rgba(255,255,255,0.2)"'>✖ Đóng</button>
            </div>
            
            <div style='background:#f8fafc;padding:12px;display:flex;gap:16px;border-bottom:2px solid #e5e7eb;'>
              <div style='flex:1;background:white;padding:12px;border-radius:6px;border-left:4px solid #10b981;'>
                <div style='font-size:24px;font-weight:bold;color:#10b981;'>${successCount}</div>
                <div style='font-size:13px;color:#64748b;margin-top:4px;'>✔ Thành công</div>
              </div>
              <div style='flex:1;background:white;padding:12px;border-radius:6px;border-left:4px solid #ef4444;'>
                <div style='font-size:24px;font-weight:bold;color:#ef4444;'>${failCount}</div>
                <div style='font-size:13px;color:#64748b;margin-top:4px;'>✖ Thất bại</div>
              </div>
              <div style='flex:1;background:white;padding:12px;border-radius:6px;border-left:4px solid #3b82f6;'>
                <div style='font-size:24px;font-weight:bold;color:#3b82f6;'>${results.length}</div>
                <div style='font-size:13px;color:#64748b;margin-top:4px;'>📋 Tổng số</div>
              </div>
            </div>
            
                        <div style='flex:1;overflow-y:auto;background:white;border:1px solid #e5e7eb;border-top:none;'>
              <table style='width:100%;border-collapse:collapse;font-size:14px;table-layout:fixed;'>
                                <thead style='position:sticky;top:0;background:#f9fafb;z-index:1;'>
                  <tr>
                    <th style='padding:10px 12px;border-bottom:2px solid #e5e7eb;text-align:center;font-size:13px;color:#64748b;font-weight:600;width:60px;'>STT</th>
                    <th style='padding:10px 12px;border-bottom:2px solid #e5e7eb;text-align:left;font-size:13px;color:#64748b;font-weight:600;width:25%;'>Mã sản phẩm</th>
                    <th style='padding:10px 12px;border-bottom:2px solid #e5e7eb;text-align:center;font-size:13px;color:#64748b;font-weight:600;width:15%;'>Số lượng</th>
                    <th style='padding:10px 12px;border-bottom:2px solid #e5e7eb;text-align:center;font-size:13px;color:#64748b;font-weight:600;width:15%;'>Đơn vị</th>
                    <th style='padding:10px 12px;border-bottom:2px solid #e5e7eb;text-align:center;font-size:13px;color:#64748b;font-weight:600;width:25%;'>Kết quả</th>
                  </tr>
                </thead>
                <tbody>
                  ${results.map((r, idx) => {
                    const bgColor = idx % 2 === 0 ? 'white' : '#f9fafb';
                    const statusBadge = r.status === 'success' 
                      ? '<span style="background:#d1fae5;color:#065f46;padding:4px 10px;border-radius:12px;font-size:12px;font-weight:600;">✔ Thành công</span>'
                      : '<span style="background:#fee2e2;color:#991b1b;padding:4px 10px;border-radius:12px;font-size:12px;font-weight:600;" title="' + (r.error || '') + '">✖ Thất bại</span>';
                    
                    return `
                                            <tr style='background:${bgColor};'>
                        <td style='padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#94a3b8;font-weight:600;text-align:center;'>${idx + 1}</td>
                        <td style='padding:10px 12px;border-bottom:1px solid #f1f5f9;'>
                          <span style='font-weight:600;color:#475569;font-size:14px;'>${r.productCode || ''}</span>
                        </td>
                        <td style='padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:700;color:#1e293b;font-size:15px;'>${r.quantity || ''}</td>
                        <td style='padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center;'>
                          <span style='background:#e0e7ff;color:#3730a3;padding:4px 12px;border-radius:6px;font-size:13px;font-weight:600;display:inline-block;'>${r.unit || ''}</span>
                        </td>
                        <td style='padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center;'>${statusBadge}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
            
                        <div style='background:#f8fafc;padding:14px 16px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;'>
              <p style='margin:0;font-size:13px;color:#64748b;'>
                💡 <strong style="color:#ef4444;">Có lỗi xảy ra.</strong> Vui lòng kiểm tra lại dữ liệu.
              </p>
              <button onclick='GM_ui.closeModal()' class='btn ghost' style='padding:8px 16px;font-size:13px;'>✖ Đóng</button>
            </div>
          </div>
        `;
        errorMessageDiv.innerHTML = html;
        errorMessageDiv.style.display = 'block';

        // Nếu thành công thì reload lại trang nhập kho
        if (importSuccess) {
          setTimeout(()=>{ GM_router.go('imports'); }, 1200);
        }

      } catch (error) {
        document.querySelector('.gm-processing-overlay')?.remove();
        errorMessageDiv.textContent = '❌ Lỗi xử lý file Excel: ' + error.message;
        errorMessageDiv.style.display = 'block';
      }
  }

  // Helper function to format Excel date
  function formatExcelDate(excelDate) {
    if (typeof excelDate === 'string') {
      // If already a string, try to parse it
      const date = new Date(excelDate);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
      return excelDate;
    }
    
    // Excel date number to JavaScript date
    const date = new Date((excelDate - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }

  

  

    // Helper function to submit import data 
  async function submitImportData(importData) {
    try {
      // Convert products to items format
      const items = [];
      
      for (const product of importData.products) {
        let existingProduct = GM_products.list().find(p => p.code === product.productCode || p.id === product.productCode);
        
        if (!existingProduct) {
          existingProduct = await GM_products.create({
            code: product.productCode,
            name: `Sản phẩm ${product.productCode}`,
            unit: product.unit || 'Cái',
            price: 0
          });
        }
        
        items.push({
          productId: existingProduct.id,
          quantity: product.quantity,
          unit: product.unit,
          note: product.note || '',
          price: 0
        });
      }
      
      const receipt = {
        receiptCode: importData.receiptNumber,
        date: importData.importDate,
        partnerName: importData.transportUnit,
        items: items,
        type: 'import',
        note: `Nhập kho hàng loạt ngày ${GM_utils.formatDate(importData.importDate)}`
      };
      
      await GM_receipts.createImport(receipt);
      await GM_stateAPI.persistAll();
      return true;
    } catch (error) {
      console.error('Error submitting import data:', error);
      return false;
    }
  }
  
  
  
  // Update import receipt
  window.updateImportReceipt = async function(receiptId) {
    const transportUnit = document.getElementById('transport-unit').value.trim();
    const importDate = document.getElementById('import-date').value;
    const receiptNumber = document.getElementById('receipt-number').value;
    
    if (!transportUnit) {
      GM_ui.toast('Vui lòng nhập đơn vị vận chuyển');
      return;
    }

    const rows = document.querySelectorAll('#import-tbody tr');
    const items = [];
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const productCode = row.querySelector('.product-code').value.trim();
  const quantity = round2(row.querySelector('.quantity').value);
      const unit = row.querySelector('.unit').value;
      const note = row.querySelector('.note').value.trim();
      
      if (!productCode) {
        GM_ui.toast(`Dòng ${i + 1}: Vui lòng nhập mã sản phẩm`);
        return;
      }
      
      if (quantity < 0) {
        GM_ui.toast(`Dòng ${i + 1}: Số lượng phải lớn hơn 0`);
        return;
      }
      
      if (!unit) {
        GM_ui.toast(`Dòng ${i + 1}: Vui lòng chọn đơn vị tính`);
        return;
      }

      // Find or create product
      let product = GM_products.list().find(p => p.code === productCode || p.id === productCode);
      
      if (!product) {
        product = await GM_products.create({
          code: productCode,
          name: productCode,
          material: '',
          size: '',
          surface: '',
          factory: '',
          price: 0,
          unit: unit
        });
      }

      items.push({
        productId: product.id,
  quantity: quantity,
        unit: unit,
        note: note,
        price: 0
      });
    }

    if (items.length === 0) {
      GM_ui.toast('Vui lòng thêm ít nhất 1 sản phẩm');
      return;
    }

    const updatedData = {
      receiptCode: receiptNumber,
      date: importDate,
      partnerName: transportUnit,
      items: items,
      type: 'import',
      note: `Nhập kho ngày ${GM_utils.formatDate(importDate)} (Đã cập nhật)`
    };

    try {
      await GM_receipts.update(receiptId, updatedData);
      await GM_stateAPI.persistAll();
      GM_ui.toast(`✅ Đã cập nhật phiếu nhập - ${receiptNumber}`);
      
      // Reset form and button
      clearSavedImportData();
      clearForm();
      
      const submitBtn = document.querySelector('.btn[onclick*="updateImportReceipt"]');
      submitBtn.textContent = '✅ Nhập kho';
      submitBtn.setAttribute('onclick', 'submitImport()');
      
      setTimeout(() => {
        GM_router.go('imports');
      }, 1000);
    } catch (error) {
      console.error('Lỗi cập nhật phiếu nhập:', error);
      GM_ui.toast('❌ Có lỗi xảy ra khi cập nhật phiếu nhập');
    }
  };
  
  
  
  // View import order details
  window.viewImportOrder = function(receiptId) {
    const imports = GM_receipts.list('import');
    console.log('All imports:', imports);
    
    const receipt = imports.find(r => r.id === receiptId);
    console.log('Found receipt:', receipt);
    
    if (!receipt) {
      GM_ui.toast('❌ Không tìm thấy phiếu nhập');
      return;
    }

    // Get product details for each item
    const items = receipt.items?.map(item => {
      const product = GM_products.list().find(p => p.id === item.productId) || {};
      return {
        ...item,
        productName: product.name || 'Không tìm thấy',
        productCode: product.code || 'N/A'
      };
    }) || [];
    
    const orderHTML = `
  <div style='max-height:70vh;overflow:auto;'>
        <div style='text-align:center;margin-bottom:20px;border-bottom:2px solid #000;padding-bottom:15px;'>
          <h2 style='margin:0;font-size:18px;font-weight:bold;'>PHIẾU NHẬP KHO</h2>
          <p style='margin:10px 0;font-size:16px;color:var(--primary);font-weight:bold;'>Số phiếu: ${receipt.receiptCode || 'N/A'}</p>
        </div>
        <div style='margin-bottom:20px;display:grid;grid-template-columns:1fr 1fr;gap:20px;'>
          <div>
            <h4 style='margin:0 0 10px 0;color:var(--text);'>📋 Thông tin phiếu nhập</h4>
            <p style='margin:5px 0;'><strong>Ngày nhập:</strong> ${GM_utils.formatDate(receipt.date)}</p>
            <p style='margin:5px 0;'><strong>Đơn vị vận chuyển:</strong> ${receipt.partnerName || 'Không có'}</p>
            <p style='margin:5px 0;'><strong>Ghi chú:</strong> ${receipt.note || 'Không có'}</p>
          </div>
          <div>
            <h4 style='margin:0 0 10px 0;color:var(--text);'>📊 Thống kê</h4>
            <p style='margin:5px 0;'><strong>Tổng số mặt hàng:</strong> ${items.length}</p>
            <p style='margin:5px 0;'><strong>Tổng số lượng:</strong> ${formatQty(items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0))}</p>
          </div>
        </div>
        <div style='margin-top:20px;'>
          <h4 style='margin:0 0 15px 0;color:var(--text);'>📦 Chi tiết sản phẩm</h4>
          <div class='table-wrap' style='max-height:400px;overflow:auto;'>
            <table class='table' style='white-space:nowrap;'>
              <thead>
                <tr>
                  <th style='position:sticky;top:0;background:white;'>STT</th>
                  <th style='position:sticky;top:0;background:white;'>Mã SP</th>
                  <th style='position:sticky;top:0;background:white;'>Tên sản phẩm</th>
                  <th style='position:sticky;top:0;background:white;text-align:right;'>Số lượng</th>
                  <th style='position:sticky;top:0;background:white;'>Đơn vị</th>
                  <th style='position:sticky;top:0;background:white;'>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                ${items.map((item, index) => `
                  <tr>
                    <td style='text-align:center;'>${index + 1}</td>
                    <td>${item.productCode}</td>
                    <td>${item.productName}</td>
                    <td style='text-align:right;'>${formatQty(item.quantity)}</td>
                    <td>${item.unit || ''}</td>
                    <td>${item.note || ''}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div style='margin-top:30px;padding:15px;background:#f8fafc;border-radius:8px;border-left:4px solid var(--primary);'>
          <p style='margin:0;font-size:12px;color:#666;'>
            <strong>Phiếu nhập được tạo:</strong> ${GM_utils.formatDate(receipt.date)} | 
            <strong>Mã phiếu:</strong> ${receipt.receiptCode}
          </p>
        </div>
      </div>
      <div style='text-align:center;margin-top:20px;'>
        <button type='button' class='btn ghost' onclick='GM_ui.closeModal()'>Đóng</button>
      </div>
    `;
  GM_ui.modal(orderHTML, { title: `Chi tiết đơn hàng - ${receipt.receiptCode}`, size: 'custom', style: 'width:700px;min-width:600px;max-width:800px;max-height:80vh;' });
  };

  function updateReceiptNumber() {
    const receiptInput = document.getElementById('receipt-number');
    if (receiptInput) {
      receiptInput.value = getNextReceiptNumber();
    }
  }

  window.addProductRow = function() {
    const tbody = document.getElementById('import-tbody');
    const rowCount = tbody.children.length + 1;
    
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
      <td>${rowCount}</td>
      <td><input class='input product-code' placeholder='Nhập mã sản phẩm' list='products-datalist' style='width:100%;' onchange='loadProductUnit(this)' /></td>
  <td><input class='input quantity' type='number' min='0' step='0.01' placeholder='Số lượng' style='width:100%;' /></td>
      <td>
        <select class='input unit' style='width:100%;'>
          <option value=''>Chọn đơn vị</option>
          <option value='Viên'>Viên</option>
          <option value='Hộp'>Hộp</option>
          <option value='Thùng'>Thùng</option>
          <option value='m²'>m²</option>
        </select>
      </td>
      <td><input class='input note' placeholder='Ghi chú' style='width:100%;' /></td>
      <td><button type='button' class='btn danger' style='padding:4px 8px;' onclick='removeRow(this)'>×</button></td>
    `;
    
    tbody.appendChild(newRow);
  };

  window.removeRow = function(button) {
    const row = button.closest('tr');
    const tbody = document.getElementById('import-tbody');
    
    if (tbody.children.length <= 1) {
      GM_ui.toast('Phải có ít nhất 1 dòng sản phẩm');
      return;
    }
    
    row.remove();
    
    Array.from(tbody.children).forEach((row, index) => {
      row.firstElementChild.textContent = index + 1;
    });
  };

  window.clearForm = function() {
    document.getElementById('transport-unit').value = '';
    document.getElementById('import-date').value = new Date().toISOString().split('T')[0];
    updateReceiptNumber();
    
    const tbody = document.getElementById('import-tbody');
    tbody.innerHTML = `
      <tr>
        <td>1</td>
        <td><input class='input product-code' placeholder='Nhập mã sản phẩm' list='products-datalist' style='width:100%;' /></td>
    <td><input class='input quantity' type='number' min='0' step='0.01' placeholder='Số lượng' style='width:100%;' /></td>
        <td>
          <select class='input unit' style='width:100%;'>
            <option value=''>Chọn đơn vị</option>
            <option value='Viên'>Viên</option>
            <option value='Hộp'>Hộp</option>
            <option value='Thùng'>Thùng</option>
            <option value='m²'>m²</option>
          </select>
        </td>
        <td><input class='input note' placeholder='Ghi chú' style='width:100%;' /></td>
        <td><button type='button' class='btn danger' style='padding:4px 8px;' onclick='removeRow(this)'>×</button></td>
      </tr>
    `;
    
    GM_ui.toast('Đã xóa form');
  };

  window.submitImport = async function() {
    const transportUnit = document.getElementById('transport-unit').value.trim();
    const importDate = document.getElementById('import-date').value;
    const receiptNumber = document.getElementById('receipt-number').value;
    
    if (!transportUnit) {
      GM_ui.toast('Vui lòng nhập đơn vị vận chuyển');
      return;
    }
    
    if (!importDate) {
      GM_ui.toast('Vui lòng chọn ngày nhập');
      return;
    }

    const rows = document.querySelectorAll('#import-tbody tr');
    const items = [];
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const productCode = row.querySelector('.product-code').value.trim();
  const quantity = round2(row.querySelector('.quantity').value);
      const unit = row.querySelector('.unit').value;
      const note = row.querySelector('.note').value.trim();
      
      if (!productCode) {
        GM_ui.toast(`Dòng ${i + 1}: Vui lòng nhập mã sản phẩm`);
        return;
      }
      
      if (quantity < 0) {
        GM_ui.toast(`Dòng ${i + 1}: Số lượng phải lớn hơn 0`);
        return;
      }
      
      if (!unit) {
        GM_ui.toast(`Dòng ${i + 1}: Vui lòng chọn đơn vị tính`);
        return;
      }

      let product = GM_products.list().find(p => p.code === productCode || p.id === productCode);
      if (!product) {
        product = await GM_products.create({
          code: productCode,
          name: productCode,
          material: '',
          size: '',
          surface: '',
          factory: '',
          price: 0,
          unit: unit
        });
      }

      items.push({
        productId: product.id,
        quantity: quantity,
        unit: unit,
        note: note,
        price: 0
      });
    }

    if (items.length === 0) {
      GM_ui.toast('Vui lòng thêm ít nhất 1 sản phẩm');
      return;
    }

    const importData = {
      receiptCode: receiptNumber,
      date: importDate,
      partnerName: transportUnit,
      items: items,
      type: 'import',
      note: `Nhập kho ngày ${GM_utils.formatDate(importDate)}`
    };

    try {
      await GM_receipts.createImport(importData);
      await GM_stateAPI.persistAll();
      GM_ui.toast(`✅ Đã nhập kho thành công - ${receiptNumber}`);
      // Đóng modal sau khi xử lý file thành công
      GM_ui.closeModal();
      // Clear saved form data after successful submission
      clearSavedImportData();
      clearForm();
      setTimeout(() => { GM_router.go('imports'); }, 1000);
    } catch (error) {
      console.error('Lỗi nhập kho:', error);
      GM_ui.toast('❌ Có lỗi xảy ra khi nhập kho');
    }
  }

  // Gán các hàm cần thiết vào window object ở cuối để đảm bảo đã được định nghĩa
  window.editImportReceipt = editImportReceipt;
  window.deleteImportReceipt = deleteImportReceipt;
  window.submitImport = submitImport;
  window.addProductRow = addProductRow;
  window.removeRow = removeRow;
  window.clearForm = clearForm;
  window.openBulkImport = openBulkImport;
  window.processBulkImport = processBulkImport;
  window.downloadTemplate = downloadTemplate;
  window.updateReceiptNumber = updateReceiptNumber;
  window.updateImportReceipt = updateImportReceipt;
  window.viewImportOrder = viewImportOrder;
})();