// ===== Elements =====
const navDashboard = document.getElementById('navDashboard');
const navInput = document.getElementById('navInput');
const dashboardPanel = document.getElementById('dashboard');
const inputPanel = document.getElementById('input');
const filterTanggal = document.getElementById('filterTanggal');
const refreshBtn = document.getElementById('refreshBtn');

const categorySelect = document.getElementById('categorySelect');
const formContainer = document.getElementById('formContainer'); 
const formNote = document.getElementById('formNote'); 
const notificationPopup = document.getElementById('notificationPopup'); // ELEMEN POP-UP BARU

// Cards elements
const orderLegend = document.getElementById('orderLegend');
const orderTable = document.getElementById('orderTable');
const paninLegend = document.getElementById('paninLegend');
const paninTable = document.getElementById('paninTable');
const tableOut = document.getElementById('tableOut');
const tableIn = document.getElementById('tableIn');
const tableBazaar = document.getElementById('tableBazaar'); 

// Buttons for actions
const exportOrderBtn = document.getElementById('exportOrder');
const deleteAllOrderBtn = document.getElementById('deleteAllOrder');
const exportPaninBtn = document.getElementById('exportPanin');
const deleteAllPaninBtn = document.getElementById('deleteAllPanin');
const exportOutBtn = document.getElementById('exportOut');
const deleteAllOutBtn = document.getElementById('deleteAllOut');
const exportInBtn = document.getElementById('exportIn');
const deleteAllInBtn = document.getElementById('deleteAllIn');
const exportBazaarBtn = document.getElementById('exportBazaar'); 
const deleteAllBazaarBtn = document.getElementById('deleteAllBazaar'); 

const charts = {};

// ===== Storage Keys =====
const KEY_ORDER = 'order';
const KEY_PANIN = 'panin';
const KEY_OUT = 'irKeluar';
const KEY_IN = 'irMasuk';
const KEY_BAZAAR = 'bazaar'; 

// ===== Form definitions =====
const formDefs = {
  order: [
    {k:'Total SO', label:'Total SO (Released)', type:'number', required:true},
    {k:'Qty Released', label:'Qty Released', type:'number', required:true},
    {k:'Done (SO)', label:'Done (By SO)', type:'number', required:true},
    {k:'Done (Qty)', label:'Done (By Qty)', type:'number', required:true},
    {k:'Pending (SO)', label:'Pending (By SO)', type:'number', readonly:true},
    {k:'%Done', label:'% Done', type:'percent', readonly:true},
    {k:'Note', label:'Keterangan (opsional)', type:'text'}
  ],
  panin: [
    {k:'Total SO', label:'Total SO (Released)', type:'number', required:true},
    {k:'Qty Released', label:'Qty Released', type:'number', required:true},
    {k:'Done (SO)', label:'Done (By SO)', type:'number', required:true},
    {k:'Done (Qty)', label:'Done (By Qty)', type:'number', required:true},
    {k:'Pending (SO)', label:'Pending (By SO)', type:'number', readonly:true},
    {k:'%Done', label:'% Done', type:'percent', readonly:true},
    {k:'Note', label:'Keterangan (opsional)', type:'text'}
  ],
  irKeluar: [
    {k:'Jumlah IR', label:'Jumlah IR', type:'number', required:true},
    {k:'WH Tujuan', label:'WH Tujuan', type:'text', required:true},
    {k:'Qty SKU', label:'Qty SKU', type:'number', required:true},
    {k:'Qty Pcs', label:'Qty Pcs', type:'number', required:true},
    {k:'Note', label:'Keterangan (opsional)', type:'text'}
  ],
  irMasuk: [
    {k:'Jumlah IR', label:'Jumlah IR', type:'number', required:true},
    {k:'WH Origin', label:'WH Origin', type:'text', required:true},
    {k:'Qty SKU', label:'Qty SKU', type:'number', required:true},
    {k:'Qty Pcs', label:'Qty Pcs', type:'number', required:true},
    {k:'Note', label:'Keterangan (opsional)', type:'text'}
  ],
  bazaar: [ 
    {k:'Nama Event', label:'Nama Event', type:'text', required:true},
    {k:'Tanggal Mulai', label:'Tanggal Mulai (DD/MM/YYYY)', type:'text', required:true},
    {k:'Tanggal Selesai', label:'Tanggal Selesai (DD/MM/YYYY)', type:'text', required:true},
    {k:'Note', label:'Keterangan (opsional)', type:'text'}
  ]
};

// ===== Helpers: load/save & Format Angka =====
function load(key){ return JSON.parse(localStorage.getItem(key) || '[]'); }
function save(key, arr){ localStorage.setItem(key, JSON.stringify(arr)); }
function formatNumber(n){ return (Number(n)||0).toLocaleString('id-ID'); }

// Helper untuk menyimpan Note yang diubah dari tabel
function saveNote(key, id, newNote) {
    let arr = load(key);
    const index = arr.findIndex(r => r.id === id);
    if (index !== -1) {
        arr[index]['Note'] = newNote;
        save(key, arr);
        return true;
    }
    return false;
}

// FUNGSI BARU: Menampilkan notifikasi pop-up
function showPopup(message) {
    if (notificationPopup) {
        notificationPopup.textContent = message || '✅ Data Dashboard berhasil diperbarui!';
        notificationPopup.classList.add('show');
        
        // Hilangkan pop-up setelah 3 detik
        setTimeout(() => {
            notificationPopup.classList.remove('show');
        }, 3000);
    }
}

// ===== Navigation =====
navDashboard.addEventListener('click', ()=> {
  navDashboard.classList.add('active');
  navInput.classList.remove('active');
  dashboardPanel.classList.add('active');
  inputPanel.classList.remove('active');
  updateDashboard();
});
navInput.addEventListener('click', ()=> {
  navInput.classList.add('active');
  navDashboard.classList.remove('active');
  inputPanel.classList.add('active');
  dashboardPanel.classList.remove('active');
});


// ===== Dynamic Form Paging & generation =====

// FUNGSI BARU: Mengatur panel mana yang harus ditampilkan
categorySelect.addEventListener('change', ()=> switchInputPanel(categorySelect.value) );

function switchInputPanel(cat) {
    // 1. Sembunyikan semua panel
    document.querySelectorAll('.category-form-panel').forEach(panel => {
        panel.classList.remove('active');
        panel.innerHTML = ''; // Hapus konten form saat berpindah
    });
    formNote.classList.remove('active');

    if (!cat) {
        formNote.classList.add('active');
        return;
    }

    const targetId = `form-${cat}`;
    const targetEl = document.getElementById(targetId);
    
    if (targetEl) {
        targetEl.classList.add('active');
        renderForm(cat, targetEl); // Panggil renderForm di kontainer target
    }
}


// MODIFIKASI: renderForm kini menerima elemen kontainer
function renderForm(cat, containerEl){
  // 1. Pastikan kontainer bersih
  containerEl.innerHTML = ''; 
  
  const defs = formDefs[cat];
  const formEl = document.createElement('div');
  formEl.className = 'form-card';
  const formTag = document.createElement('form');
  formTag.id = `formTag-${cat}`; // ID unik

  defs.forEach(def=>{
    const label = document.createElement('label'); 
    label.textContent = def.label + (def.required ? ' *' : '');
    let input = document.createElement('input');
    input.name = def.k;
    input.id = def.k.replace(/\s+/g, '_').replace(/[\(\)]/g, ''); 
    input.placeholder = def.label;
    input.type = (def.type === 'number' || def.type === 'percent') ? 'number' : 'text';
    input.step = (def.type === 'percent') ? '0.01' : '1';
    if(def.required) input.required = true;
    if(def.readonly) { input.readOnly = true; input.style.background = '#f0fdfa'; }
    formTag.appendChild(label);
    formTag.appendChild(input);
  });

  // form actions
  const actions = document.createElement('div'); actions.className='form-actions';
  const saveBtn = document.createElement('button'); saveBtn.type='submit'; saveBtn.className='btn'; saveBtn.textContent='💾 Simpan Data';
  const resetBtn = document.createElement('button'); resetBtn.type='button'; resetBtn.className='btn small'; resetBtn.textContent='✖ Reset';
  actions.appendChild(saveBtn); actions.appendChild(resetBtn);
  formTag.appendChild(actions);
  formEl.appendChild(formTag);
  containerEl.appendChild(formEl); // Appen ke kontainer yang spesifik

  // auto calc for order & panin
  if(cat === 'order' || cat === 'panin'){
    const totalSO = formTag.querySelector('input[name="Total SO"]');
    const qty = formTag.querySelector('input[name="Qty Released"]');
    const doneSO = formTag.querySelector('input[name="Done (SO)"]');
    const doneQty = formTag.querySelector('input[name="Done (Qty)"]');
    const pendingSO = formTag.querySelector('input[name="Pending (SO)"]');
    const pct = formTag.querySelector('input[name="%Done"]');

    const calc = ()=> {
      const totalSov = Number(totalSO?.value) || 0;
      const doneSov = Number(doneSO?.value) || 0;

      // LOGIKA PERSENTASE: Done (SO) / Total SO
      if(pct) pct.value = totalSov ? ((doneSov / totalSov) * 100).toFixed(2) : 0;
      
      if(pendingSO) pendingSO.value = Math.max(0, totalSov - doneSov); 
    };

    if(qty && doneQty && totalSO && doneSO){
      qty.addEventListener('input', calc);
      doneQty.addEventListener('input', calc);
      totalSO.addEventListener('input', calc);
      doneSO.addEventListener('input', calc);
    }
    calc(); 
  }

  // handle submit
  formTag.addEventListener('submit', (ev)=>{
    ev.preventDefault();
    if(!formTag.checkValidity()){ alert('⚠️ Mohon isi semua field yang wajib diisi.'); return; } 

    const fd = new FormData(formTag);
    const entry = { id: Date.now(), Tanggal: new Date().toLocaleDateString('id-ID') };
    let isValid = true;

    for(const [k,v] of fd.entries()){
      const def = defs.find(d=> d.k === k);
      if(def && (def.type === 'number' || def.type === 'percent')) {
        const numVal = v === '' ? 0 : Number(v);
        if(isNaN(numVal)){ isValid = false; break; }
        entry[k] = numVal;
      }
      else entry[k] = v;
    }

    if(!isValid) { alert('⚠️ Input Angka tidak valid.'); return; }

    // save to corresponding key
    if(cat === 'order'){ const arr = load(KEY_ORDER); arr.push(entry); save(KEY_ORDER, arr); }
    if(cat === 'panin'){ const arr = load(KEY_PANIN); arr.push(entry); save(KEY_PANIN, arr); }
    if(cat === 'irKeluar'){ const arr = load(KEY_OUT); arr.push(entry); save(KEY_OUT, arr); }
    if(cat === 'irMasuk'){ const arr = load(KEY_IN); arr.push(entry); save(KEY_IN, arr); }
    if(cat === 'bazaar'){ const arr = load(KEY_BAZAAR); arr.push(entry); save(KEY_BAZAAR, arr); } 

    alert('✅ Data tersimpan');
    renderForm(cat, containerEl); // reset form
    populateTanggalOptions();
    updateDashboard();
  });

  resetBtn.addEventListener('click', ()=> renderForm(cat, containerEl)); // reset form
}

// ===== Populate tanggal options =====
function populateTanggalOptions(){
  const all = [
    ...load(KEY_ORDER), 
    ...load(KEY_PANIN), 
    ...load(KEY_OUT), 
    ...load(KEY_IN),
    ...load(KEY_BAZAAR) 
  ];
  const dates = [...new Set(all.map(x => x.Tanggal))].sort((a,b) => new Date(b) - new Date(a));
  filterTanggal.innerHTML = `<option value="all">📅 Semua Tanggal</option>` + dates.map(d => `<option value="${d}">${d}</option>`).join('');
}

// ===== Render Chart & Card (Order & Panin) =====
function createPie(ctx, done, pending, colorDone='#374151', colorPend='#cc0000'){
  return new Chart(ctx, {
    type:'pie',
    data: { labels:['Done','Pending'], datasets:[{ data:[done, pending], backgroundColor:[colorDone, colorPend] }]},
    options: {
      plugins: {
        legend:{ position:'right' },
        datalabels:{ color:'#000', formatter:(val, ctx)=> {
          const total = ctx.chart.data.datasets[0].data.reduce((a,b)=>a+b,0);
          return total ? `${formatNumber(val)} (${((val/total)*100).toFixed(1)}%)` : `${formatNumber(val)} (0%)`;
        }, font:{ weight:'700', size:13 } } 
      },
      maintainAspectRatio:false
    },
    plugins: [ChartDataLabels]
  });
}

// Order Card (Keterangan editable) - Diubah untuk menggunakan SO
function renderOrderCard(list){
  const ctx = document.getElementById('chartOrder').getContext('2d');
  if(charts.order) charts.order.destroy();
  
  // LOGIKA CHART DIUBAH: Menggunakan Done (SO) dan Total SO
  const done = list.reduce((s,r)=> s + (Number(r['Done (SO)'])||0), 0);
  const total = list.reduce((s,r)=> s + (Number(r['Total SO'])||0), 0);
  
  const pending = Math.max(0, total - done);
  charts.order = createPie(ctx, done, pending, '#38bdf8', '#ff385c');

  // legend + list


  if(!list.length){ 
    const p=document.createElement('div'); 
    p.textContent='Belum ada data untuk tanggal ini.'; 
    orderLegend.appendChild(p); 
  }

  // table (Note cell made editable)
  const thead = orderTable.querySelector('thead');
  const tbody = orderTable.querySelector('tbody');
  if(!list.length){ thead.innerHTML=''; tbody.innerHTML=`<tr><td colspan="9">Belum ada data</td></tr>`; return; }
  const headers = ['Tanggal','Total SO','Qty Released','Done (SO)','Done (Qty)','Pending (SO)','%Done','Note'];
  thead.innerHTML = '<tr>' + headers.map(h=> `<th>${h}</th>`).join('') + '<th>Aksi</th></tr>';
  tbody.innerHTML = list.map(item=> {
    // Note cell made editable with data attributes
    const noteCell = `<td contenteditable="true" data-key="${KEY_ORDER}" data-id="${item.id}">${item['Note'] || ''}</td>`;

    return `<tr>
      <td>${item['Tanggal'] || ''}</td>
      <td>${formatNumber(item['Total SO'])}</td>
      <td>${formatNumber(item['Qty Released'])}</td>
      <td>${formatNumber(item['Done (SO)'])}</td>
      <td>${formatNumber(item['Done (Qty)'])}</td>
      <td>${formatNumber(item['Pending (SO)'])}</td>
      <td>${item['%Done'] || ''}%</td>
      ${noteCell}
      <td><button class="deleteBtn" data-cat="order" data-id="${item.id}">🗑️</button></td>
    </tr>`;
  }).join('');
  
  // Attach delete handler
  tbody.querySelectorAll('.deleteBtn').forEach(btn=>{
    btn.addEventListener('click', (ev)=>{
      const id = Number(ev.currentTarget.dataset.id);
      let arr = load(KEY_ORDER);
      arr = arr.filter(r=> r.id !== id);
      save(KEY_ORDER, arr);
      populateTanggalOptions();
      updateDashboard();
      alert('🗑️ Entry dihapus.');
    });
  });

  // Attach note edit listener
  tbody.querySelectorAll('td[contenteditable="true"]').forEach(td => {
    td.addEventListener('blur', (ev) => {
      const id = Number(ev.currentTarget.dataset.id);
      const key = ev.currentTarget.dataset.key;
      const newNote = ev.currentTarget.textContent.trim();
      
      if(saveNote(key, id, newNote)) {
          // Re-render the card to update the legend/summary list
          updateDashboard();
      }
    });
    // Prevent line breaks in editable cells and trigger save on Enter
    td.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.target.blur(); 
        }
    });
  });
}

// Panin Card (Keterangan editable) - Diubah untuk menggunakan SO
function renderPaninCard(list){
  const ctx = document.getElementById('chartPanin').getContext('2d');
  if(charts.panin) charts.panin.destroy();

  // LOGIKA CHART DIUBAH: Menggunakan Done (SO) dan Total SO
  const done = list.reduce((s,r)=> s + (Number(r['Done (SO)'])||0), 0);
  const total = list.reduce((s,r)=> s + (Number(r['Total SO'])||0), 0);
  
  const pending = Math.max(0, total - done);
  charts.panin = createPie(ctx, done, pending, '#38bdf8', '#ff385c');

  // legend + list
 if(!list.length){ 
    const p=document.createElement('div'); 
    p.textContent='Belum ada data untuk tanggal ini.'; 
    paninLegend.appendChild(p); 
  }

  // table (Note cell made editable)
  const thead = paninTable.querySelector('thead');
  const tbody = paninTable.querySelector('tbody');
  if(!list.length){ thead.innerHTML=''; tbody.innerHTML=`<tr><td colspan="9">Belum ada data</td></tr>`; return; }
  const headers = ['Tanggal','Total SO','Qty Released','Done (SO)','Done (Qty)','Pending (SO)','%Done','Note'];
  thead.innerHTML = '<tr>' + headers.map(h=> `<th>${h}</th>`).join('') + '<th>Aksi</th></tr>';
  tbody.innerHTML = list.map(item=> {
    // Note cell made editable with data attributes
    const noteCell = `<td contenteditable="true" data-key="${KEY_PANIN}" data-id="${item.id}">${item['Note'] || ''}</td>`;

    return `<tr>
      <td>${item['Tanggal'] || ''}</td>
      <td>${formatNumber(item['Total SO'])}</td>
      <td>${formatNumber(item['Qty Released'])}</td>
      <td>${formatNumber(item['Done (SO)'])}</td>
      <td>${formatNumber(item['Done (Qty)'])}</td>
      <td>${formatNumber(item['Pending (SO)'])}</td>
      <td>${item['%Done'] || ''}%</td>
      ${noteCell}
      <td><button class="deleteBtn" data-cat="panin" data-id="${item.id}">🗑️</button></td>
    </tr>`;
  }).join('');
  
  // Attach delete handler
  tbody.querySelectorAll('.deleteBtn').forEach(btn=>{
    btn.addEventListener('click', (ev)=>{
      const id = Number(ev.currentTarget.dataset.id);
      let arr = load(KEY_PANIN);
      arr = arr.filter(r=> r.id !== id);
      save(KEY_PANIN, arr);
      populateTanggalOptions();
      updateDashboard();
      alert('🗑️ Entry dihapus.');
    });
  });

  // Attach note edit listener
  tbody.querySelectorAll('td[contenteditable="true"]').forEach(td => {
    td.addEventListener('blur', (ev) => {
      const id = Number(ev.currentTarget.dataset.id);
      const key = ev.currentTarget.dataset.key;
      const newNote = ev.currentTarget.textContent.trim();
      
      if(saveNote(key, id, newNote)) {
          // Re-render the card to update the legend/summary list
          updateDashboard();
      }
    });
    // Prevent line breaks in editable cells and trigger save on Enter
    td.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.target.blur(); 
        }
    });
  });
}

// ===== Render IR/Bazaar tables (Keterangan editable) =====
function renderIrTable(id, list, keyName){
  const table = document.getElementById(id);
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');

  if(!list.length){ thead.innerHTML=''; tbody.innerHTML=`<tr><td colspan="8">Belum ada data</td></tr>`; return; }

  // Use ordered headers from formDefs
  const orderedHeaders = ['Tanggal', ...formDefs[keyName].map(d=>d.k)];
  
  thead.innerHTML = '<tr>' + orderedHeaders.map(h=> `<th>${h}</th>`).join('') + '<th>Aksi</th></tr>';

  tbody.innerHTML = list.map(item=>{
    return `<tr>
      ${orderedHeaders.map(h=> {
        const def = formDefs[keyName].find(d=>d.k === h);
        const val = item[h] || '';
        
        // Handle Note column as editable
        if(h === 'Note'){
            // Note cell made editable with data attributes
            return `<td contenteditable="true" data-key="${keyName}" data-id="${item.id}">${val || ''}</td>`;
        }

        // Format angka
        if(def && (def.type === 'number' || def.type === 'percent')){
          return `<td>${formatNumber(val)}${def.type === 'percent' ? '%' : ''}</td>`;
        }
        return `<td>${val}</td>`;
      }).join('')}
      <td><button class="deleteBtn" data-key="${keyName}" data-id="${item.id}">🗑️</button></td>
    </tr>`;
  }).join('');

  // Delete handler 
  tbody.querySelectorAll('.deleteBtn').forEach(btn=>{
    btn.addEventListener('click', (ev)=>{
      const id = Number(ev.currentTarget.dataset.id);
      const key = ev.currentTarget.dataset.key;
      let arr = load(key);
      arr = arr.filter(r=> r.id !== id);
      save(key, arr);
      populateTanggalOptions();
      updateDashboard();
      alert('🗑️ Entry dihapus.');
    });
  });

  // Attach note edit listener for IR/Bazaar tables
  tbody.querySelectorAll('td[contenteditable="true"]').forEach(td => {
    // We only need to attach to TDs that contain the data-id attribute (which is the Note column in this context)
    if(td.dataset.id) {
        td.addEventListener('blur', (ev) => {
            const id = Number(ev.currentTarget.dataset.id);
            const key = ev.currentTarget.dataset.key;
            const newNote = ev.currentTarget.textContent.trim();
            saveNote(key, id, newNote);
        });
        // Prevent line breaks in editable cells and trigger save on Enter
        td.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.target.blur(); 
            }
        });
    }
  });
}

// ===== Update dashboard (Updated: Tambah Bazaar) =====
function updateDashboard(){
  const selected = filterTanggal.value || 'all';
  const getFiltered = (arrKey) => {
    const arr = load(arrKey);
    return selected === 'all' ? arr : arr.filter(x => x.Tanggal === selected);
  };

  const orderList = getFiltered(KEY_ORDER);
  const paninList = getFiltered(KEY_PANIN);
  const outList = getFiltered(KEY_OUT);
  const inList = getFiltered(KEY_IN);
  const bazaarList = getFiltered(KEY_BAZAAR); 

  renderOrderCard(orderList);
  renderPaninCard(paninList);
  renderIrTable('tableOut', outList, KEY_OUT);
  renderIrTable('tableIn', inList, KEY_IN);
  renderIrTable('tableBazaar', bazaarList, KEY_BAZAAR); 
  
  // Panggil notifikasi setelah selesai update
  showPopup();
}

// ===== Delete all handlers & export handlers (Tidak ada perubahan) =====
deleteAllOrderBtn.addEventListener('click', ()=> {
  if(!confirm('Hapus semua Data Order? Tindakan ini tidak bisa dibatalkan!')) return;
  save(KEY_ORDER, []); populateTanggalOptions(); updateDashboard(); alert('Semua Data Order dihapus.');
});
deleteAllPaninBtn.addEventListener('click', ()=> {
  if(!confirm('Hapus semua Data Panin? Tindakan ini tidak bisa dibatalkan!')) return;
  save(KEY_PANIN, []); populateTanggalOptions(); updateDashboard(); alert('Semua Data Panin dihapus.');
});
deleteAllOutBtn.addEventListener('click', ()=> {
  if(!confirm('Hapus semua Data IR Keluar? Tindakan ini tidak bisa dibatalkan!')) return;
  save(KEY_OUT, []); populateTanggalOptions(); updateDashboard(); alert('Semua Data IR Keluar dihapus.');
});
deleteAllInBtn.addEventListener('click', ()=> {
  if(!confirm('Hapus semua Data IR Masuk? Tindakan ini tidak bisa dibatalkan!')) return;
  save(KEY_IN, []); populateTanggalOptions(); updateDashboard(); alert('Semua Data IR Masuk dihapus.');
});
deleteAllBazaarBtn.addEventListener('click', ()=> { 
  if(!confirm('Hapus semua Data Bazaar? Tindakan ini tidak bisa dibatalkan!')) return;
  save(KEY_BAZAAR, []); populateTanggalOptions(); updateDashboard(); alert('Semua Data Bazaar dihapus.');
});

// export simple CSV helper
function exportCSV(filename, headers, rows){
  const csv = [headers.join(',')].concat(rows.map(r => headers.map(h => `"${(r[h]||'')}"`).join(','))).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

exportOrderBtn.addEventListener('click', ()=>{
  const arr = load(KEY_ORDER);
  if(!arr.length){ alert('Belum ada data Order.'); return; }
  const headers = ['Tanggal','Total SO','Qty Released','Done (SO)','Done (Qty)','Pending (SO)','%Done','Note'];
  exportCSV(`order_${new Date().toISOString().slice(0,10)}.csv`, headers, arr);
});
exportPaninBtn.addEventListener('click', ()=>{
  const arr = load(KEY_PANIN);
  if(!arr.length){ alert('Belum ada data Panin.'); return; }
  const headers = ['Tanggal','Total SO','Qty Released','Done (SO)','Done (Qty)','Pending (SO)','%Done','Note'];
  exportCSV(`panin_${new Date().toISOString().slice(0,10)}.csv`, headers, arr);
});
exportOutBtn.addEventListener('click', ()=>{
  const arr = load(KEY_OUT);
  if(!arr.length){ alert('Belum ada data IR Keluar.'); return; }
  const headers = ['Tanggal', ...formDefs[KEY_OUT].map(d=>d.k)];
  exportCSV(`irkeluar_${new Date().toISOString().slice(0,10)}.csv`, headers, arr);
});
exportInBtn.addEventListener('click', ()=>{
  const arr = load(KEY_IN);
  if(!arr.length){ alert('Belum ada data IR Masuk.'); return; }
  const headers = ['Tanggal', ...formDefs[KEY_IN].map(d=>d.k)];
  exportCSV(`irmasuk_${new Date().toISOString().slice(0,10)}.csv`, headers, arr);
});
exportBazaarBtn.addEventListener('click', ()=>{ 
  const arr = load(KEY_BAZAAR);
  if(!arr.length){ alert('Belum ada data Bazaar.'); return; }
  const headers = ['Tanggal', ...formDefs[KEY_BAZAAR].map(d=>d.k)];
  exportCSV(`bazaar_${new Date().toISOString().slice(0,10)}.csv`, headers, arr);
});


// ===== Events: filter / refresh / INIT =====
filterTanggal.addEventListener('change', updateDashboard);
refreshBtn.addEventListener('click', updateDashboard);

// ===== INIT =====
populateTanggalOptions();
updateDashboard();
switchInputPanel('');