// src/core/cloud-init.js
// Initial load data từ Firestore khi app khởi động

(async function(){
  console.log('[CloudInit] Starting initial data load from Firestore...');
  
  // Wait for Firebase to be ready
  let attempts = 0;
  while (!window.firebaseDb || !window.FB) {
    if (attempts++ > 20) {
      console.warn('[CloudInit] Firebase not available after 10s, skipping cloud load');
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  const { firebaseDb: db, FB } = window;
  
  try {
    // Parallel fetch all collections
    const [productsSnap, importsSnap, exportsSnap, customersSnap, historySnap] = await Promise.all([
      FB.getDocs(FB.collection(db, 'products')),
      FB.getDocs(FB.collection(db, 'receipts_import')),
      FB.getDocs(FB.collection(db, 'receipts_export')),
      FB.getDocs(FB.collection(db, 'customers')),
      FB.getDocs(FB.collection(db, 'history'))
    ]);
    
    // Convert to arrays
    const cloudProducts = productsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const cloudImports = importsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const cloudExports = exportsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const cloudCustomers = customersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const cloudHistory = historySnap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    console.log('[CloudInit] Fetched from Firestore:', {
      products: cloudProducts.length,
      imports: cloudImports.length,
      exports: cloudExports.length,
      customers: cloudCustomers.length,
      history: cloudHistory.length
    });
    
    // Smart merge: Cloud data wins if newer
    function smartMerge(localArray, cloudArray, arrayName) {
      const merged = [...localArray];
      const localById = Object.create(null);
      localArray.forEach(item => { if (item?.id) localById[item.id] = item; });
      
      let added = 0;
      let updated = 0;
      
      cloudArray.forEach(cloudItem => {
        if (!cloudItem?.id) return;
        
        const localItem = localById[cloudItem.id];
        
        if (!localItem) {
          // New item from cloud
          merged.push(cloudItem);
          added++;
        } else {
          // Compare timestamps
          const cloudTime = cloudItem._syncedAt || cloudItem._serverSyncedAt || 0;
          const localTime = localItem._syncedAt || 0;
          
          const cloudDate = typeof cloudTime === 'string' ? Date.parse(cloudTime) : 0;
          const localDate = typeof localTime === 'string' ? Date.parse(localTime) : 0;
          
          if (cloudDate > localDate) {
            // Cloud is newer, update local
            Object.assign(localItem, cloudItem);
            updated++;
          }
        }
      });
      
      if (added > 0 || updated > 0) {
        console.log(`[CloudInit] ${arrayName}: +${added} new, ~${updated} updated`);
      }
      
      return merged;
    }
    
    // Apply smart merge
    if (cloudProducts.length > 0) {
      GM_state.products = smartMerge(GM_state.products, cloudProducts, 'Products');
    }
    
    if (cloudImports.length > 0) {
      GM_state.imports = smartMerge(GM_state.imports, cloudImports, 'Imports');
    }
    
    if (cloudExports.length > 0) {
      GM_state.exports = smartMerge(GM_state.exports, cloudExports, 'Exports');
    }
    
    if (cloudCustomers.length > 0) {
      GM_state.customers = smartMerge(GM_state.customers, cloudCustomers, 'Customers');
    }
    
    if (cloudHistory.length > 0) {
      GM_state.history = smartMerge(GM_state.history, cloudHistory, 'History');
    }
    
    // Save merged data to local storage
    await GM_stateAPI.persistAll();
    
    console.log('[CloudInit] ✅ Initial cloud sync complete!');
    
    // Dispatch event to notify UI
    window.dispatchEvent(new CustomEvent('gm:cloud-synced'));
    
  } catch (error) {
    console.error('[CloudInit] Error loading from Firestore:', error);
    
    // Show user-friendly error
    if (window.GM_ui) {
      GM_ui.toast('⚠️ Không thể tải dữ liệu từ cloud. Đang dùng dữ liệu local.', { timeout: 3000 });
    }
  }
})();