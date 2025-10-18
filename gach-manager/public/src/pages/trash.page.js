(function(){
  GM_router.register('trash', renderTrashPage);
  
  function renderTrashPage(root){
    const stats = GM_trash.getStats();
    
    root.innerHTML = `
      <div class='page-head'>
        <h2>🗑️ Thùng rác</h2>
        <div style='display:flex;gap:16px;align-items:center;'>
          <div class='stats-card' style='background:linear-gradient(135deg,#ef4444,#dc2626);color:white;padding:12px 20px;border-radius:8px;'>
            <span style='font-size:24px;font-weight:bold;'>${stats.total}</span>
            <span style='font-size:14px;opacity:0.9;'>Items</span>
          </div>
          ${stats.expiringSoon > 0 ? `
            <div class='stats-card' style='background:linear-gradient(135deg,#f59e0b,#d97706);color:white;padding:12px 20px;border-radius:8px;'>
              <span style='font-size:18px;font-weight:bold;'>${stats.expiringSoon}</span>
              <span style='font-size:12px;opacity:0.9;'>Sắp hết hạn</span>
            </div>
          ` : ''}
        </div>
      </div>
      
      <div class='card'>
        <div style='display:flex;justify-content:between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:16px;'>
          <div style='flex:1;min-width:300px;'>
            <div style='position:relative;'>
              <input id='trash-search' class='input' placeholder='🔍 Tìm kiếm trong thùng rác...' style='padding-right:100px;' />
              <select id='type-filter' class='input' style='position:absolute;right:0;top:0;width:90px;border-left:1px solid var(--border);'>
                <option value=''>Tất cả</option>
                <option value='product'>Sản phẩm</option>
                <option value='customer'>Khách hàng</option>
                <option value='receipt'>Phiếu</option>
              </select>
            </div>
          </div>
          
          <div style='display:flex;gap:12px;'>
            <button class='btn ghost' onclick='refreshTrash()' style='padding:8px 16px;'>🔄 Làm mới</button>
            <button class='btn danger' onclick='emptyTrash()' style='padding:8px 16px;' ${stats.total === 0 ? 'disabled' : ''}>🗑️ Xóa tất cả</button>
          </div>
        </div>
        
        <div style='background:#fef9c3;border:1px solid #f59e0b;border-radius:6px;padding:12px;margin-bottom:20px;'>
          <div style='display:flex;align-items:center;gap:8px;color:#92400e;'>
            <span style='font-size:18px;'>⚠️</span>
            <div>
              <strong>Lưu ý:</strong> Items trong thùng rác sẽ tự động bị xóa vĩnh viễn sau <strong>14 ngày</strong>.
              <br><small>Hãy khôi phục những items quan trọng trước khi hết hạn.</small>
            </div>
          </div>
        </div>
        
        <div id='trash-content'>
          ${renderTrashContent()}
        </div>
      </div>
    `;
    
    // Event listeners
    document.getElementById('trash-search').addEventListener('input', filterTrash);
    document.getElementById('type-filter').addEventListener('change', filterTrash);
  }
  
  function renderTrashContent() {
    const items = GM_trash.list();
    
    if (items.length === 0) {
      return `
        <div style='text-align:center;padding:60px 20px;color:var(--text-light);'>
          <div style='font-size:64px;margin-bottom:16px;opacity:0.5;'>🗑️</div>
          <h3 style='margin:0 0 8px 0;color:var(--text);'>Thùng rác trống</h3>
          <p style='margin:0;'>Chưa có items nào bị xóa.</p>
        </div>
      `;
    }
    
    return `
      <div class='table-wrap'>
        <table class='table professional-table'>
          <thead>
            <tr style='background:linear-gradient(135deg,#6366f1,#4f46e5);color:white;'>
              <th style='padding:16px 12px;text-align:left;font-weight:600;'>📦 Item</th>
              <th style='padding:16px 12px;text-align:center;font-weight:600;'>🏷️ Loại</th>
              <th style='padding:16px 12px;text-align:center;font-weight:600;'>📅 Xóa lúc</th>
              <th style='padding:16px 12px;text-align:center;font-weight:600;'>⏰ Hết hạn</th>
              <th style='padding:16px 12px;text-align:center;font-weight:600;'>🎬 Thao tác</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, index) => renderTrashRow(item, index)).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
  
  function renderTrashRow(item, index) {
    const data = item.data;
    const now = new Date();
    const expiresAt = new Date(item.expiresAt);
    const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
    
    const isExpired = daysLeft <= 0;
    const isExpiringSoon = daysLeft <= 3 && daysLeft > 0;
    
    const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
    
    // Determine display info based on type
    let displayName = '';
    let displayInfo = '';
    
    switch (item.type) {
      case 'product':
        displayName = data.name || data.code || 'Sản phẩm không tên';
        displayInfo = `Mã: ${data.code || 'N/A'}`;
        break;
      case 'customer':
        displayName = data.name || 'Khách hàng không tên';
        displayInfo = `SĐT: ${data.phone || 'N/A'}`;
        break;
      case 'receipt':
        displayName = `Phiếu ${data.receiptCode || data.receiptNumber || 'N/A'}`;
        displayInfo = `Khách: ${data.partnerName || data.transportUnit || 'N/A'}`;
        break;
      default:
        displayName = 'Item không xác định';
        displayInfo = '';
    }
    
    const typeColors = {
      'product': '#3b82f6',
      'customer': '#10b981', 
      'receipt': '#f59e0b'
    };
    
    const typeNames = {
      'product': 'Sản phẩm',
      'customer': 'Khách hàng',
      'receipt': 'Phiếu'
    };
    
    const expiryColor = isExpired ? '#dc2626' : isExpiringSoon ? '#f59e0b' : '#059669';
    const expiryText = isExpired ? 'Đã hết hạn' : `${daysLeft} ngày`;
    
    return `
      <tr style='background:${rowBg};transition:all 0.2s;${isExpired ? 'opacity:0.6;' : ''}' 
          onmouseover='this.style.background="#e0f2fe";this.style.transform="translateY(-1px)"' 
          onmouseout='this.style.background="${rowBg}";this.style.transform="translateY(0)"'>
        
        <td style='padding:16px 12px;border:1px solid #e5e7eb;'>
          <div style='display:flex;align-items:center;gap:12px;'>
            <div style='width:40px;height:40px;border-radius:8px;background:${typeColors[item.type] || '#64748b'};display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:14px;'>
              ${item.type.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style='font-weight:600;color:#1e293b;margin-bottom:2px;'>${displayName}</div>
              <div style='font-size:13px;color:#64748b;'>${displayInfo}</div>
            </div>
          </div>
        </td>
        
        <td style='padding:16px 12px;border:1px solid #e5e7eb;text-align:center;'>
          <span style='background:${typeColors[item.type] || '#64748b'};color:white;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:500;'>
            ${typeNames[item.type] || item.type}
          </span>
        </td>
        
        <td style='padding:16px 12px;border:1px solid #e5e7eb;text-align:center;color:#64748b;'>
          ${GM_utils.formatDate(item.deletedAt)}
        </td>
        
        <td style='padding:16px 12px;border:1px solid #e5e7eb;text-align:center;'>
          <span style='color:${expiryColor};font-weight:600;'>
            ${expiryText}
          </span>
        </td>
        
        <td style='padding:16px 12px;border:1px solid #e5e7eb;text-align:center;'>
          <div style='display:flex;gap:8px;justify-content:center;'>
            ${!isExpired ? `
              <button class='btn ghost' style='padding:6px 12px;font-size:12px;' onclick='restoreItem("${item.id}")' title='Khôi phục'>
                ↩️ Khôi phục
              </button>
            ` : ''}
            <button class='btn danger' style='padding:6px 12px;font-size:12px;' onclick='permanentDeleteItem("${item.id}")' title='Xóa vĩnh viễn'>
              🗑️ Xóa
            </button>
            <button class='btn ghost' style='padding:6px 12px;font-size:12px;' onclick='viewTrashDetails("${item.id}")' title='Xem chi tiết'>
              👁️
            </button>
          </div>
        </td>
      </tr>
    `;
  }
  
  // Filter trash items
  function filterTrash() {
    const searchQuery = document.getElementById('trash-search').value;
    const typeFilter = document.getElementById('type-filter').value;
    
    const filteredItems = GM_trash.search(searchQuery, typeFilter || null);
    
    const contentDiv = document.getElementById('trash-content');
    
    if (filteredItems.length === 0) {
      contentDiv.innerHTML = `
        <div style='text-align:center;padding:40px 20px;color:var(--text-light);'>
          <div style='font-size:48px;margin-bottom:16px;opacity:0.5;'>🔍</div>
          <h3 style='margin:0 0 8px 0;color:var(--text);'>Không tìm thấy kết quả</h3>
          <p style='margin:0;'>Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc.</p>
        </div>
      `;
      return;
    }
    
    contentDiv.innerHTML = `
      <div class='table-wrap'>
        <table class='table professional-table'>
          <thead>
            <tr style='background:linear-gradient(135deg,#6366f1,#4f46e5);color:white;'>
              <th style='padding:16px 12px;text-align:left;font-weight:600;'>📦 Item</th>
              <th style='padding:16px 12px;text-align:center;font-weight:600;'>🏷️ Loại</th>
              <th style='padding:16px 12px;text-align:center;font-weight:600;'>📅 Xóa lúc</th>
              <th style='padding:16px 12px;text-align:center;font-weight:600;'>⏰ Hết hạn</th>
              <th style='padding:16px 12px;text-align:center;font-weight:600;'>🎬 Thao tác</th>
            </tr>
          </thead>
          <tbody>
            ${filteredItems.map((item, index) => renderTrashRow(item, index)).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
  
  // Restore item from trash
  window.restoreItem = function(trashId) {
    if (!confirm('Bạn có chắc muốn khôi phục item này?')) return;
    
    try {
      const restoredItem = GM_trash.restore(trashId);
      GM_ui.toast('✅ Đã khôi phục item thành công!');
      
      // Refresh trash view
      refreshTrash();
      
    } catch (error) {
      console.error('Restore error:', error);
      GM_ui.toast('❌ Lỗi khôi phục: ' + error.message);
    }
  };
  
  // Permanently delete item
  window.permanentDeleteItem = function(trashId) {
    if (!confirm('⚠️ CẢNH BÁO: Item sẽ bị xóa vĩnh viễn và không thể khôi phục. Bạn có chắc chắn?')) return;
    
    try {
      GM_trash.permanentDelete(trashId);
      GM_ui.toast('✅ Đã xóa vĩnh viễn item');
      
      // Refresh trash view
      refreshTrash();
      
    } catch (error) {
      console.error('Delete error:', error);
      GM_ui.toast('❌ Lỗi xóa item');
    }
  };
  
  // View trash item details
  window.viewTrashDetails = function(trashId) {
    const items = GM_trash.list();
    const item = items.find(i => i.id === trashId);
    
    if (!item) {
      GM_ui.toast('❌ Không tìm thấy item');
      return;
    }
    
    const detailsHTML = `
      <div style='padding:20px;max-width:600px;'>
        <h3 style='margin:0 0 20px 0;color:var(--text);'>🗑️ Chi tiết item đã xóa</h3>
        
        <div style='background:#f8fafc;padding:16px;border-radius:8px;margin-bottom:20px;'>
          <div style='display:grid;grid-template-columns:120px 1fr;gap:12px;align-items:center;'>
            <strong>Loại:</strong> <span style='color:var(--primary);'>${item.type}</span>
            <strong>ID gốc:</strong> <span>${item.originalId}</span>
            <strong>Xóa lúc:</strong> <span>${GM_utils.formatDate(item.deletedAt)}</span>
            <strong>Hết hạn:</strong> <span>${GM_utils.formatDate(item.expiresAt)}</span>
          </div>
        </div>
        
        <h4 style='margin:0 0 12px 0;color:var(--text);'>📄 Dữ liệu gốc:</h4>
        <pre style='background:#f1f5f9;padding:16px;border-radius:6px;font-size:12px;overflow:auto;max-height:300px;border:1px solid #e2e8f0;'>${JSON.stringify(item.data, null, 2)}</pre>
        
        <div style='text-align:right;margin-top:20px;'>
          <button class='btn ghost' onclick='GM_ui.closeModal()'>Đóng</button>
        </div>
      </div>
    `;
    
    GM_ui.modal(detailsHTML, { title: 'Chi tiết item đã xóa', size: 'lg' });
  };
  
  // Empty entire trash
  window.emptyTrash = function() {
    const stats = GM_trash.getStats();
    
    if (stats.total === 0) {
      GM_ui.toast('ℹ️ Thùng rác đã trống');
      return;
    }
    
    const confirmMessage = `⚠️ CẢNH BÁO NGHIÊM TRỌNG:\n\nBạn sắp xóa vĩnh viễn TẤT CẢ ${stats.total} items trong thùng rác.\nHành động này KHÔNG THỂ HOÀN TÁC!\n\nBạn có THỰC SỰ chắc chắn?`;
    
    if (!confirm(confirmMessage)) return;
    
    // Double confirm
    if (!confirm('Xác nhận lần cuối: XÓA TẤT CẢ khỏi thùng rác?')) return;
    
    try {
      GM_trash.empty();
      GM_ui.toast('✅ Đã làm trống thùng rác');
      
      // Refresh page
  GM_router.go('trash');
      
    } catch (error) {
      console.error('Empty trash error:', error);
      GM_ui.toast('❌ Lỗi làm trống thùng rác');
    }
  };
  
  // Refresh trash view
  window.refreshTrash = function() {
    // Auto cleanup expired items
    const removedCount = GM_trash.cleanupExpired();
    
    if (removedCount > 0) {
      GM_ui.toast(`🧹 Đã tự động xóa ${removedCount} items hết hạn`);
    }
    
    // Refresh page
  GM_router.go('trash');
  };
  
})();