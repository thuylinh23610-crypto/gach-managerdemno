(function(){
  GM_router.register('history', renderHistoryPage);

  // Trạng thái bộ lọc và ngày đang mở
  let historyFilter = { type:'', start:'', end:'' };
  let openDays = new Set();

  function renderHistoryPage(root){
    root.innerHTML = `
      <div class='page-head' style='display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap;'>
        <h2 style='margin:0;'>🕒 Lịch sử</h2>
        <div class='filters' style='display:flex;gap:8px;align-items:center;'>
          <select id='f-type' class='input' style='padding:6px 10px;'>
            <option value=''>Tất cả</option>
            <option value='import'>Nhập</option>
            <option value='export'>Xuất</option>
            <option value='delete'>Xóa SP</option>
            <option value='restore'>Phục hồi SP</option>
            <option value='price_change'>Đổi giá</option>
          </select>
          <div style='display:flex;gap:6px;align-items:center;'>
            <label style='font-size:12px;color:#6b7280'>Từ</label>
            <input id='f-start' type='date' class='input' style='padding:6px 8px' />
          </div>
          <div style='display:flex;gap:6px;align-items:center;'>
            <label style='font-size:12px;color:#6b7280'>Đến</label>
            <input id='f-end' type='date' class='input' style='padding:6px 8px' />
          </div>
          <button id='f-clear' class='btn ghost' style='padding:6px 10px'>Xóa lọc</button>
        </div>
      </div>
      <div id='history-list'>${renderHistoryContent()}</div>
    `;

    // Gán giá trị ban đầu
    document.getElementById('f-type').value = historyFilter.type;
    document.getElementById('f-start').value = historyFilter.start;
    document.getElementById('f-end').value = historyFilter.end;

    // Sự kiện thay đổi bộ lọc
    document.getElementById('f-type').onchange = (e)=>{ historyFilter.type = e.target.value; rerender(); };
    document.getElementById('f-start').oninput = (e)=>{ historyFilter.start = e.target.value; rerender(); };
    document.getElementById('f-end').oninput = (e)=>{ historyFilter.end = e.target.value; rerender(); };
    document.getElementById('f-clear').onclick = ()=>{ historyFilter = { type:'', start:'', end:'' }; rerender(); };
  }

  function label(ev){
    switch(ev.type){
      case 'import': return 'Nhập';
      case 'export': return 'Xuất';
      case 'delete': return 'Xóa SP';
      case 'restore': return 'Phục hồi SP';
      case 'price_change': return 'Đổi giá';
      default: return ev.type;
    }
  }

  function renderHistoryContent(){
    const events = GM_history.list();
    // Lọc theo type và khoảng ngày
    const filtered = events.filter(ev=>{
      if (historyFilter.type && ev.type !== historyFilter.type) return false;
      const d = (ev.date||'').slice(0,10);
      if (historyFilter.start && d < historyFilter.start) return false;
      if (historyFilter.end && d > historyFilter.end) return false;
      return true;
    });

    if(!filtered.length) return `<div class='empty'><h3>Không có dữ liệu</h3><p>Điều chỉnh bộ lọc thời gian/loại sự kiện.</p></div>`;

    // Gom nhóm theo ngày YYYY-MM-DD (mới trước)
    const groups = {};
    for(const ev of filtered){ const key=(ev.date||'').slice(0,10); if(!groups[key]) groups[key]=[]; groups[key].push(ev); }
    const days = Object.keys(groups).sort((a,b)=> a<b?1:-1);

    const html = days.map(day=>{
      const list = groups[day];
      const open = openDays.has(day);
      // Tính số bản ghi + tổng số lượng nếu có
      const qtySum = list.reduce((s,ev)=> s + (Number(ev.quantity)||0), 0);
      return `
        <div class='history-day'>
          <div class='history-day__header' onclick='window.toggleHistoryDay && window.toggleHistoryDay("${day}")' style='cursor:pointer;display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;background:${open?"#eef2ff":"#f8fafc"};margin-top:10px;'>
            <div style='display:flex;align-items:center;gap:10px;'>
              <span style='font-weight:700;color:#1e40af;'>${GM_utils.formatDate(day)}</span>
              <span style='color:#6b7280'>• ${list.length} sự kiện</span>
              ${qtySum?`<span style='color:#6b7280'>• Tổng SL: ${qtySum.toLocaleString()}</span>`:''}
            </div>
            <div style='color:#6b7280;font-size:12px'>Bấm để ${open?"thu gọn":"mở chi tiết"}</div>
          </div>
          <div id='history-day-${day}' style='display:${open?"block":"none"};margin-top:8px;'>
            <div class='table-wrap'>
              <table class='table'>
                <thead>
                  <tr>
                    <th style='width:160px'>Thời gian</th>
                    <th style='width:120px'>Loại</th>
                    <th>Mã phiếu / SP</th>
                    <th style='width:100px'>SL</th>
                    <th style='width:130px'>Giá</th>
                  </tr>
                </thead>
                <tbody>
                  ${list.map(ev=>`<tr>
                    <td>${GM_utils.formatDate(ev.date)}</td>
                    <td>${label(ev)}</td>
                    <td>${ev.receiptCode||ev.productCode||''}</td>
                    <td style='text-align:center'>${ev.quantity||''}</td>
                    <td style='text-align:right'>${ev.price?GM_utils.formatMoney(ev.price):''}</td>
                  </tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    }).join('');

    return html;
  }

  function rerender(){
    const list = document.getElementById('history-list');
    if (list) list.innerHTML = renderHistoryContent();
  }

  // Toggle mở/đóng ngày
  window.toggleHistoryDay = function(day){
    if (openDays.has(day)) openDays.delete(day); else openDays.add(day);
    rerender();
  }
})();