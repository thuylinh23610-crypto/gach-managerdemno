window.GM_receipts = (function(){
  const S=GM_CONST.STORAGE;
  function generateCode(prefix, existing){ let max=0; existing.forEach(r=>{ const m=new RegExp('^'+prefix+'(\n?)(\\d+)$').exec(r.receiptCode); if(m){ const num=parseInt(m[2]||m[1]||'',10); if(num>max) max=num; }}); return prefix+String(max+1).padStart(3,'0'); }
  function list(type){ if(!type) return [...GM_state.imports, ...GM_state.exports]; if(type==='import') return GM_state.imports; return GM_state.exports; }
  async function createImport({items, partnerName, note}){ const code = genCode('PN', GM_state.imports); const date=GM_utils.nowISO(); const total = GM_utils.sum(items, i=> i.quantity * i.price); const rec={ id:GM_utils.uid(), receiptCode:code, type:'import', items, partnerName, note, date, totalAmount: total }; GM_state.imports.push(rec); addHistoryForReceipt(rec); await persist(); try { await cloudUpsertImport(rec); } catch(_) {} return rec; }
  async function createExport(data){
    const { items=[], partnerName, partnerType, partnerPhone, partnerAddress, prepaidAmount=0, note } = data||{};
    const code = data?.receiptCode || genCode('PX', GM_state.exports);
    const date = data?.date || GM_utils.nowISO();
    const total = data?.totalAmount != null ? data.totalAmount : GM_utils.sum(items, i=> (Number(i.quantity)||0) * (Number(i.price)||0));
    const rec = {
      id: GM_utils.uid(),
      receiptCode: code,
      type: 'export',
      items,
      partnerName,
      partnerType,
      partnerPhone,
      partnerAddress,
      date,
      prepaidAmount,
      totalAmount: total,
      note
    };
    GM_state.exports.push(rec); addHistoryForReceipt(rec); await persist();
    // Cloud sync (upsert export)
    try { await cloudUpsertExport(rec); } catch(_) {}
    return rec;
  }
  function genCode(prefix, arr){ let max=0; arr.forEach(r=>{ const m=/^(?:PN|PX)(\d+)$/.exec(r.receiptCode); if(m) max=Math.max(max, parseInt(m[1],10)); }); return prefix+String(max+1).padStart(3,'0'); }
  function addHistoryForReceipt(rec){ rec.items.forEach(it=>{ GM_state.history.push({ id:GM_utils.uid(), type:rec.type, productId:it.productId, quantity:it.quantity, price:it.price, receiptCode:rec.receiptCode, date:rec.date }); }); }
  
  // Update receipt function
  async function update(receiptId, updatedData) {
    // Find receipt in imports or exports
    let receipt = GM_state.imports.find(r => r.id === receiptId);
    let isImport = true;
    
    if (!receipt) {
      receipt = GM_state.exports.find(r => r.id === receiptId);
      isImport = false;
    }
    
    if (!receipt) {
      throw new Error('Receipt not found');
    }
    
    // Remove old history entries for this receipt
    GM_state.history = GM_state.history.filter(h => h.receiptCode !== receipt.receiptCode);
    
    // Update receipt data
    Object.assign(receipt, updatedData);
    
    // Add new history entries
    addHistoryForReceipt(receipt);
    
    await persist();
    // Cloud sync (upsert to proper collection)
    try { if (isImport) await cloudUpsertImport(receipt); else await cloudUpsertExport(receipt); } catch(_) {}
    return receipt;
  }
  
  // Delete receipt function
  async function deleteReceipt(receiptId) {
    // Find and remove from imports
    let receiptIndex = GM_state.imports.findIndex(r => r.id === receiptId);
    let receipt = null;
    let receiptType = null;
    
    if (receiptIndex !== -1) {
      receipt = GM_state.imports[receiptIndex];
      receiptType = 'import';
      
      // Move to trash
      if (window.GM_trash) {
        GM_trash.add(receipt, 'receipt');
      }
      
      GM_state.imports.splice(receiptIndex, 1);
    } else {
      // Find and remove from exports
      receiptIndex = GM_state.exports.findIndex(r => r.id === receiptId);
      if (receiptIndex !== -1) {
        receipt = GM_state.exports[receiptIndex];
        receiptType = 'export';
        
        // Move to trash
        if (window.GM_trash) {
          GM_trash.add(receipt, 'receipt');
        }
        
        GM_state.exports.splice(receiptIndex, 1);
      }
    }
    
    if (!receipt) {
      throw new Error('Receipt not found');
    }
    
    // Keep history entries (don't remove them)
    // They might be useful for audit purposes
    
    await persist();
    // Cloud sync (delete from proper collection)
    try { if (receiptType === 'export') await cloudDeleteExport(receiptId); else if (receiptType === 'import') await cloudDeleteImport(receiptId); } catch(_) {}
    return receipt;
  }
  
  // Add new method for adding receipts (used by trash restore)
  async function add(receiptData) {
    // Ensure unique ID
    if (!receiptData.id) {
      receiptData.id = GM_utils.uid();
    }
    
    // Determine type and add to appropriate list
  if (receiptData.type === 'import' || receiptData.transportUnit) {
      // Check for duplicate ID in imports
      if (GM_state.imports.find(r => r.id === receiptData.id)) {
        receiptData.id = GM_utils.uid();
      }
      GM_state.imports.push(receiptData);
  } else {
      // Check for duplicate ID in exports
      if (GM_state.exports.find(r => r.id === receiptData.id)) {
        receiptData.id = GM_utils.uid();
      }
      GM_state.exports.push(receiptData);
    }
    
    await persist();
    // Cloud sync (upsert to proper collection)
    try { if (receiptData.type === 'export') await cloudUpsertExport(receiptData); else if (receiptData.type === 'import') await cloudUpsertImport(receiptData); } catch(_) {}
    return receiptData;
  }
  
  // Check if receipt exists by ID
  function exists(id) {
    return GM_state.imports.some(r => r.id === id) || 
           GM_state.exports.some(r => r.id === id);
  }
  
  async function persist(){ await GM_storage.write(S.IMPORTS, GM_state.imports); await GM_storage.write(S.EXPORTS, GM_state.exports); await GM_storage.write(S.HISTORY, GM_state.history); }
  
  // Cloud helpers for export receipts
  function hasCloud(){ const db = window.firebaseDb; const FB = window.FB; return (db && FB) ? { db, FB } : null; }
  async function cloudUpsertExport(rec){
    const h = hasCloud(); if (!h) return false;
    const { db, FB } = h;
    const col = FB.collection(db, 'receipts_export');
    const id = rec.id || GM_utils.uid();
    const ref = FB.doc(col, id);
    const payload = { ...rec, _syncedAt: new Date().toISOString(), _serverSyncedAt: FB.serverTimestamp() };
    await FB.setDoc(ref, payload, { merge: true });
    return true;
  }
  async function cloudDeleteExport(id){
    const h = hasCloud(); if (!h) return false;
    const { db, FB } = h;
    const ref = FB.doc(FB.collection(db, 'receipts_export'), id);
    await FB.deleteDoc(ref);
    return true;
  }
  // Cloud helpers for import receipts
  async function cloudUpsertImport(rec){
    const h = hasCloud(); if (!h) return false;
    const { db, FB } = h;
    const col = FB.collection(db, 'receipts_import');
    const id = rec.id || GM_utils.uid();
    const ref = FB.doc(col, id);
    const payload = { ...rec, _syncedAt: new Date().toISOString(), _serverSyncedAt: FB.serverTimestamp() };
    await FB.setDoc(ref, payload, { merge: true });
    return true;
  }
  async function cloudDeleteImport(id){
    const h = hasCloud(); if (!h) return false;
    const { db, FB } = h;
    const ref = FB.doc(FB.collection(db, 'receipts_import'), id);
    await FB.deleteDoc(ref);
    return true;
  }
  
  return { list, createImport, createExport, update, delete: deleteReceipt, add, exists };
})();