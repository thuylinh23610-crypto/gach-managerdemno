(function(){
  // Trash Service - Quản lý thùng rác với auto-cleanup sau 14 ngày
  
  const TRASH_KEY = 'GM_trash_items';
  const RETENTION_DAYS = 14;
  
  const GM_trash = {
    
    // Thêm item vào thùng rác
    add: function(item, type) {
      const trashItems = this.list();
      
      const trashItem = {
        id: String(Date.now() + Math.random()),
        originalId: item.id,
        type: type, // 'product', 'customer', 'receipt', etc.
        data: JSON.parse(JSON.stringify(item)), // Deep copy
        deletedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString(),
        deletedBy: 'user' // Could be extended to track which user
      };
      
      trashItems.push(trashItem);
      localStorage.setItem(TRASH_KEY, JSON.stringify(trashItems));
      
      console.log(`Item moved to trash: ${type} - ${item.id}`);
      return trashItem.id;
    },
    
    // Lấy danh sách items trong thùng rác
    list: function(type = null, skipCleanup = false) {
      try {
        const items = JSON.parse(localStorage.getItem(TRASH_KEY) || '[]');
        
        // Filter by type if specified
        if (type) {
          return items.filter(item => item.type === type);
        }
        
        return items;
      } catch (e) {
        console.error('Error loading trash items:', e);
        return [];
      }
    },
    
    // Khôi phục item từ thùng rác
    restore: function(trashId) {
      const trashItems = this.list();
  const trashItem = trashItems.find(item => String(item.id) === String(trashId));
      
      if (!trashItem) {
        throw new Error('Không tìm thấy item trong thùng rác');
      }
      
      // Check if expired
      if (new Date() > new Date(trashItem.expiresAt)) {
        throw new Error('Item đã hết hạn, không thể khôi phục');
      }
      
      // Restore to original service
      let restored = false;
      
      switch (trashItem.type) {
        case 'product':
          if (window.GM_products) {
            // Check if ID already exists
            if (GM_products.exists(trashItem.data.id)) {
              trashItem.data.id = Date.now(); // Generate new ID
            }
            GM_products.add(trashItem.data);
            restored = true;
          }
          break;
          
        case 'customer':
          if (window.GM_customers) {
            if (GM_customers.exists(trashItem.data.id)) {
              trashItem.data.id = Date.now();
            }
            GM_customers.add(trashItem.data);
            restored = true;
          }
          break;
          
        case 'receipt':
          if (window.GM_receipts) {
            if (GM_receipts.exists(trashItem.data.id)) {
              trashItem.data.id = Date.now();
            }
            GM_receipts.add(trashItem.data);
            restored = true;
          }
          break;
          
        default:
          throw new Error('Không hỗ trợ khôi phục loại item này');
      }
      
      if (restored) {
        // Remove from trash
        this.permanentDelete(trashId);
        console.log(`Item restored from trash: ${trashItem.type} - ${trashItem.originalId}`);
        return trashItem.data;
      } else {
        throw new Error('Không thể khôi phục item');
      }
    },
    
    // Xóa vĩnh viễn item khỏi thùng rác
    permanentDelete: function(trashId) {
      const trashItems = this.list();
  const filteredItems = trashItems.filter(item => String(item.id) !== String(trashId));
      localStorage.setItem(TRASH_KEY, JSON.stringify(filteredItems));
      return true;
    },
    
    // Xóa tất cả items trong thùng rác
    empty: function() {
      localStorage.removeItem(TRASH_KEY);
      console.log('Trash emptied');
      return true;
    },
    
    // Tự động dọn dẹp items hết hạn
    cleanupExpired: function() {
      // Read items from localStorage directly to avoid re-entering list() which calls cleanupExpired
      try {
        const items = JSON.parse(localStorage.getItem(TRASH_KEY) || '[]');
        const now = new Date();

        const validItems = items.filter(item => new Date(item.expiresAt) > now);

        // Save only valid items
        localStorage.setItem(TRASH_KEY, JSON.stringify(validItems));

        const removedCount = items.length - validItems.length;
        if (removedCount > 0) {
          console.log(`Auto-cleaned ${removedCount} expired items from trash`);
        }

        return removedCount;
      } catch (e) {
        console.error('Error during cleanupExpired:', e);
        return 0;
      }
    },
    
    // Lấy thống kê thùng rác
    getStats: function() {
      const items = this.list();
      const now = new Date();
      
      const stats = {
        total: items.length,
        byType: {},
        expiringSoon: 0, // expires in next 3 days
        expired: 0
      };
      
      items.forEach(item => {
        // Count by type
        stats.byType[item.type] = (stats.byType[item.type] || 0) + 1;
        
        // Check expiration
        const expiresAt = new Date(item.expiresAt);
        const daysUntilExpiry = (expiresAt - now) / (1000 * 60 * 60 * 24);
        
        if (daysUntilExpiry <= 0) {
          stats.expired++;
        } else if (daysUntilExpiry <= 3) {
          stats.expiringSoon++;
        }
      });
      
      return stats;
    },
    
    // Tìm kiếm trong thùng rác
    search: function(query, type = null) {
      const items = this.list(type);
      
      if (!query || query.trim() === '') {
        return items;
      }
      
      const searchQuery = query.toLowerCase().trim();
      
      return items.filter(item => {
        const data = item.data;
        
        // Search in common fields
        const searchFields = [
          data.name,
          data.code,
          data.phone,
          data.address,
          data.receiptCode,
          data.partnerName
        ].filter(field => field);
        
        return searchFields.some(field => 
          field.toString().toLowerCase().includes(searchQuery)
        );
      });
    }
  };
  
  // Auto cleanup on service load
  setTimeout(() => {
    GM_trash.cleanupExpired();
  }, 1000);
  
  // Setup periodic cleanup (every hour)
  setInterval(() => {
    GM_trash.cleanupExpired();
  }, 60 * 60 * 1000);
  
  // Make available globally
  window.GM_trash = GM_trash;
  
})();