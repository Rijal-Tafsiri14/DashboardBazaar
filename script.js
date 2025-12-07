/**************************************************************
 * Operasional Dashboard - script.js (dengan form editable untuk
 * Data Order & Project Panin yang sinkron ke Overview)
 **************************************************************/

/* ========================== Utils ========================== */
const Utils = (() => {
  const formatDate = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const humanDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" });
  };

  const percent = (done, total) => {
    if (!total || Number(total) === 0) return 0;
    return Math.round((Number(done) / Number(total)) * 1000) / 10;
  };

  const id = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;

  const debounce = (fn, delay = 300) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
  };

  const sortByDateDesc = (list, key = "tanggal") => [...list].sort((a, b) => new Date(b[key]) - new Date(a[key]));

  const inDateRange = (dateStr, start, end) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    if (start && d < new Date(start)) return false;
    if (end && d > new Date(end)) return false;
    return true;
  };

  return { formatDate, humanDate, percent, id, debounce, sortByDateDesc, inDateRange };
})();

/* ========================== Storage ======================== */
class StorageManager {
  constructor(ns = "operasional_panel") { this.ns = ns; }
  key(name) { return `${this.ns}:${name}`; }
  get(name) { const raw = localStorage.getItem(this.key(name)); try { return raw ? JSON.parse(raw) : []; } catch { return []; } }
  set(name, data) { localStorage.setItem(this.key(name), JSON.stringify(data)); }
  upsert(name, item, idField = "id") {
    const list = this.get(name);
    const idx = list.findIndex((x) => x[idField] === item[idField]);
    if (idx >= 0) list[idx] = item; else list.push(item);
    this.set(name, list); return item;
  }
  delete(name, idValue, idField = "id") {
    const list = this.get(name).filter((x) => x[idField] !== idValue);
    this.set(name, list); return list;
  }
  clear(name) { this.set(name, []); }
}

const storage = new StorageManager();

/* registries */
const formsRegistry = {};   // schemaKey -> FormBuilder instance
const tableRegistry = {};   // schemaKey -> TableBuilder instance

/* ========================== Schema ========================= */
const Schema = {
  dataOrder: {
    title: "Data Order",
    storageKey: "dataOrder",
    fields: [
      { name: "tanggal", label: "Tanggal", type: "date", required: true },
      { name: "soRelease", label: "SO Release", type: "number", min: 0, required: true },
      { name: "qtyRelease", label: "Qty Release", type: "number", min: 0, required: true },
      { name: "doneSO", label: "Done SO", type: "number", min: 0, required: true },
      { name: "doneQty", label: "Done Qty", type: "number", min: 0, required: true },
      { name: "pendingQty", label: "Pending Qty", type: "number", min: 0, computed: (v) => Math.max(0, Number(v.soRelease) - Number(v.doneSO)) },
      { name: "percentDone", label: "% Done", type: "number", min: 0, max: 100, step: "0.1", computed: (v) => Utils.percent(v.doneSO, v.soRelease) },
      { name: "keterangan", label: "Keterangan", type: "textarea" }
    ],
    tableColumns: [
      { key: "tanggal", label: "Tanggal", format: Utils.humanDate },
      { key: "soRelease", label: "SO Release" },
      { key: "qtyRelease", label: "Qty Release" },
      { key: "doneSO", label: "Done SO" },
      { key: "doneQty", label: "Done Qty" },
      { key: "pendingQty", label: "Pending Qty" },
      { key: "percentDone", label: "% Done", format: (v) => `${v}%` },
      { key: "keterangan", label: "Keterangan" }
    ]
  },
  projectPanin: {
    title: "Project Bank Panin",
    storageKey: "projectPanin",
    fields: [
      { name: "tanggal", label: "Tanggal", type: "date", required: true },
      { name: "soRelease", label: "SO Release", type: "number", min: 0, required: true },
      { name: "qtyRelease", label: "Qty Release", type: "number", min: 0, required: true },
      { name: "doneSO", label: "Done SO", type: "number", min: 0, required: true },
      { name: "doneQty", label: "Done Qty", type: "number", min: 0, required: true },
      { name: "pendingQty", label: "Pending Qty", type: "number", min: 0, computed: (v) => Math.max(0, Number(v.soRelease) - Number(v.doneSO)) },
      { name: "percentDone", label: "% Done", type: "number", min: 0, max: 100, step: "0.1", computed: (v) => Utils.percent(v.doneSO, v.soRelease) },
      { name: "keterangan", label: "Keterangan", type: "textarea" }
    ],
    tableColumns: [
      { key: "tanggal", label: "Tanggal", format: Utils.humanDate },
      { key: "soRelease", label: "SO Release" },
      { key: "qtyRelease", label: "Qty Release" },
      { key: "doneSO", label: "Done SO" },
      { key: "doneQty", label: "Done Qty" },
      { key: "pendingQty", label: "Pending Qty" },
      { key: "percentDone", label: "% Done", format: (v) => `${v}%` },
      { key: "keterangan", label: "Keterangan" }
    ]
  },
  irKeluar: {
    title: "IR Keluar",
    storageKey: "irKeluar",
    fields: [
      { name: "tanggal", label: "Tanggal", type: "date", required: true },
      { name: "jumlahIR", label: "Jumlah IR", type: "number", min: 0, required: true },
      { name: "warehouseDest", label: "Warehouse Destination", type: "text", required: true },
      { name: "totalSKU", label: "Total SKU", type: "number", min: 0, required: true },
      { name: "totalQty", label: "Total qty", type: "number", min: 0, required: true },
      { name: "keterangan", label: "Keterangan", type: "textarea" }
    ],
    tableColumns: [
      { key: "tanggal", label: "Tanggal", format: Utils.humanDate },
      { key: "jumlahIR", label: "Jumlah IR" },
      { key: "warehouseDest", label: "Warehouse" },
      { key: "totalSKU", label: "Total SKU" },
      { key: "totalQty", label: "Total Qty" },
      { key: "keterangan", label: "Keterangan" }
    ]
  },
  irMasuk: {
    title: "IR Masuk ",
    storageKey: "irMasuk",
    fields: [
      { name: "tanggal", label: "Tanggal", type: "date", required: true },
      { name: "jumlahIR", label: "Jumlah IR", type: "number", min: 0, required: true },
      { name: "warehouseDest", label: "Warehouse Origin", type: "text", required: true },
      { name: "totalSKU", label: "Total SKU", type: "number", min: 0, required: true },
      { name: "totalQty", label: "Total qty", type: "number", min: 0, required: true },
      { name: "keterangan", label: "Keterangan", type: "textarea" }
    ],
    tableColumns: [
      { key: "tanggal", label: "Tanggal", format: Utils.humanDate },
      { key: "jumlahIR", label: "Jumlah IR" },
      { key: "warehouseDest", label: "Warehouse" },
      { key: "totalSKU", label: "Total SKU" },
      { key: "totalQty", label: "Total Qty" },
      { key: "keterangan", label: "Keterangan" }
    ]
  },
  bazaar: {
    title: "Bazaar",
    storageKey: "bazaar",
    fields: [
      { name: "namaProject", label: "Nama Project", type: "text", required: true },
      { name: "tanggalMulai", label: "Tanggal Mulai", type: "date", required: true },
      { name: "tanggalSelesai", label: "Tanggal Selesai", type: "date", required: true },
      { name: "keterangan", label: "Keterangan", type: "textarea" }
    ],
    tableColumns: [
      { key: "namaProject", label: "Nama Project" },
      { key: "tanggalMulai", label: "Mulai", format: Utils.humanDate },
      { key: "tanggalSelesai", label: "Selesai", format: Utils.humanDate },
      { key: "keterangan", label: "Keterangan" }
    ]
  }
};

/* ========================== Form Builder =================== */
class FormBuilder {
  constructor(schema, storage, onChange) {
    this.schema = schema; this.storage = storage; this.onChange = onChange;
    this.formEl = null; this.editId = null;
  }

  render(container, initialData = null) {
    const card = document.createElement("div");
    card.className = "form-card";
    const title = document.createElement("h3");
    title.className = "form-title";
    title.textContent = this.schema.title;
    card.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "form-grid";
    card.appendChild(grid);

    this.schema.fields.forEach(f => {
      const wrap = document.createElement("div");
      wrap.className = "field";
      const label = document.createElement("label");
      label.textContent = f.label;
      const input = this.createInput(f);
      input.name = f.name;
      wrap.appendChild(label);
      wrap.appendChild(input);
      grid.appendChild(wrap);
    });

    const actions = document.createElement("div");
    actions.className = "form-actions";
    const save = document.createElement("button");
    save.className = "btn primary"; save.type = "button"; save.textContent = "Simpan";
    const reset = document.createElement("button");
    reset.className = "btn"; reset.type = "button"; reset.textContent = "Reset Form";
    actions.appendChild(save); actions.appendChild(reset);
    card.appendChild(actions);

    const notice = document.createElement("div");
    notice.className = "notice hidden";
    notice.id = `notice_${this.schema.storageKey}`;
    card.appendChild(notice);
const recentWrap = document.createElement("div");
recentWrap.className = "recent-wrap";
recentWrap.innerHTML = `
  <h4 class="recent-title">Entri Terbaru</h4>
  <div class="recent-list" id="recent_${this.schema.storageKey}"></div>
`;
card.appendChild(recentWrap);

// helper untuk render recent list
this.renderRecentList = () => {
  const listEl = card.querySelector(`#recent_${this.schema.storageKey}`);
  if (!listEl) return;
  const all = this.storage.get(this.schema.storageKey);
  const rows = Utils.sortByDateDesc(all, this.schema.fields[0]?.name || "tanggal").slice(0, 8);
  listEl.innerHTML = rows.map(r => `
    <div class="recent-row" data-id="${r.id}">
      <div class="recent-left">
        <div class="recent-date">${Utils.humanDate(r.tanggal ?? r.tanggalMulai ?? "")}</div>
        <div class="recent-meta">${(r.soRelease ?? r.jumlahIR ?? "-")} • ${(r.totalQty ?? r.qtyRelease ?? "-")}</div>
      </div>
      <div class="recent-actions">
        <button class="btn small edit-recent" data-id="${r.id}">Edit</button>
        <button class="btn small danger del-recent" data-id="${r.id}">Hapus</button>
      </div>
    </div>
  `).join("");
};

// initial render recent list
this.renderRecentList();

// event delegation for recent actions
card.addEventListener("click", (e) => {
  const editBtn = e.target.closest(".edit-recent");
  const delBtn = e.target.closest(".del-recent");
  if (editBtn) {
    const id = editBtn.dataset.id;
    const list = this.storage.get(this.schema.storageKey);
    const item = list.find(x => x.id === id);
    if (item) {
      this.fill(item);
      // switch to this section view
      document.querySelectorAll(".view").forEach(v => v.classList.remove("show"));
      const viewEl = document.getElementById(this.schema.storageKey);
      if (viewEl) viewEl.classList.add("show");
      document.querySelectorAll(".menu-item").forEach(m => m.classList.remove("active"));
      const menuBtn = document.querySelector(`.menu-item[data-target="${this.schema.storageKey}"]`);
      if (menuBtn) menuBtn.classList.add("active");
    }
  }
  if (delBtn) {
    const id = delBtn.dataset.id;
    if (!confirm("Hapus data ini?")) return;
    this.storage.delete(this.schema.storageKey, id);
    // refresh form recent list, section table, overview, charts
    if (typeof this.renderRecentList === "function") this.renderRecentList();
    const tbl = tableRegistry[this.schema.storageKey];
    if (tbl) tbl.refresh();
    refreshOverview();
    refreshCharts();
  }
});
    container.appendChild(card);
    this.formEl = card;

    if (initialData) this.fill(initialData);
    save.addEventListener("click", () => this.submit());
    reset.addEventListener("click", () => this.clear());
    card.addEventListener("input", Utils.debounce(() => this.applyComputed()));
    this.applyComputed();
  }

  createInput(field) {
    let el;
    if (field.type === "textarea") {
      el = document.createElement("textarea");
      el.className = "textarea";
    } else if (field.type === "select") {
      el = document.createElement("select");
      el.className = "select";
      (field.options || []).forEach(o => {
        const opt = document.createElement("option");
        opt.value = o.value ?? o; opt.textContent = o.label ?? o;
        el.appendChild(opt);
      });
    } else {
      el = document.createElement("input");
      el.className = "input";
      el.type = field.type || "text";
      if (field.min !== undefined) el.min = field.min;
      if (field.max !== undefined) el.max = field.max;
      if (field.step !== undefined) el.step = field.step;
      if (field.type === "date") el.value = Utils.formatDate();
    }
    if (field.required) el.required = true;
    return el;
  }

  fill(data) {
    this.editId = data.id;
    this.schema.fields.forEach(f => {
      const input = this.formEl.querySelector(`[name="${f.name}"]`);
      if (!input) return;
      input.value = data[f.name] ?? "";
    });
    this.applyComputed();
  }

  clear() {
    this.editId = null;
    this.schema.fields.forEach(f => {
      const input = this.formEl.querySelector(`[name="${f.name}"]`);
      if (!input) return;
      if (f.type === "date") input.value = Utils.formatDate(); else input.value = "";
    });
    this.applyComputed();
    this.showNotice("Form direset.", "warn");
  }

  getValues() {
    const values = {};
    this.schema.fields.forEach(f => {
      const input = this.formEl.querySelector(`[name="${f.name}"]`);
      values[f.name] = input ? (f.type === "number" ? Number(input.value || 0) : input.value) : null;
    });
    return values;
  }

  applyComputed() {
    const values = this.getValues();
    this.schema.fields.forEach(f => {
      if (typeof f.computed === "function") {
        const computedVal = f.computed(values);
        const input = this.formEl.querySelector(`[name="${f.name}"]`);
        if (input) input.value = computedVal;
      }
    });
  }

  validate(values) {
    const errors = [];
    this.schema.fields.forEach(f => {
      const v = values[f.name];
      if (f.required && (v === "" || v === null || v === undefined)) errors.push(`${f.label} wajib diisi.`);
      if (f.type === "number") {
        const num = Number(v);
        if (isNaN(num)) errors.push(`${f.label} harus berupa angka.`);
        if (f.min !== undefined && num < f.min) errors.push(`${f.label} minimal ${f.min}.`);
        if (f.max !== undefined && num > f.max) errors.push(`${f.label} maksimal ${f.max}.`);
      }
    });
    return errors;
  }

  submit() {
    this.applyComputed();
    const values = this.getValues();
    const errs = this.validate(values);
    if (errs.length) { this.showNotice(errs.join(" "), "danger"); return; }

    const item = { id: this.editId || Utils.id(), ...values };
    this.storage.upsert(this.schema.storageKey, item);
    this.showNotice(this.editId ? "Data berhasil diperbarui." : "Data berhasil disimpan.", "success");
    this.editId = null;

    if (typeof this.onChange === "function") this.onChange();
    this.clear();
  }

  showNotice(text, type = "warn") {
    const el = this.formEl.querySelector(`#notice_${this.schema.storageKey}`);
    if (!el) return;
    el.textContent = text;
    el.className = `notice`;
    el.style.borderColor = type === "danger" ? "#fecaca" : type === "success" ? "#86efac" : "#fde68a";
    el.style.background = type === "danger" ? "#fef2f2" : type === "success" ? "#ecfdf5" : "#fff7ed";
    el.style.color = type === "danger" ? "#7f1d1d" : type === "success" ? "#14532d" : "#92400e";
    el.classList.remove("hidden");
    setTimeout(() => el.classList.add("hidden"), 2500);
  }
}

/* ========================== Table Builder ================== */
class TableBuilder {
  constructor(schema, storage, onEdit, onDelete) {
    this.schema = schema; this.storage = storage; this.onEdit = onEdit; this.onDelete = onDelete;
    this.tableWrap = null;
  }

  render(container) {
    const card = document.createElement("div");
    card.className = "table-card";

    const header = document.createElement("div");
    header.className = "table-header";
    const title = document.createElement("h3");
    title.textContent = `Tabel ${this.schema.title}`;

    // Filter tanggal (per tabel)
    const filterWrap = document.createElement("div");
    filterWrap.className = "filter-wrap";
    const startInput = document.createElement("input");
    startInput.type = "date";
    startInput.value = localStorage.getItem(`${this.schema.storageKey}_filterStart`) || "";
    const endInput = document.createElement("input");
    endInput.type = "date";
    endInput.value = localStorage.getItem(`${this.schema.storageKey}_filterEnd`) || "";
    const filterBtn = document.createElement("button");
    filterBtn.className = "btn";
    filterBtn.textContent = "Filter";

    filterWrap.appendChild(startInput);
    filterWrap.appendChild(endInput);
    filterWrap.appendChild(filterBtn);

    header.appendChild(title);
    header.appendChild(filterWrap);
    card.appendChild(header);

    const table = document.createElement("table");
    table.className = "table";
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    this.schema.tableColumns.forEach(c => {
      const th = document.createElement("th"); th.textContent = c.label;
      headRow.appendChild(th);
    });
    const actionsTh = document.createElement("th"); actionsTh.textContent = "Actions";
    headRow.appendChild(actionsTh);
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody"); table.appendChild(tbody);

    card.appendChild(table);
    container.appendChild(card);

    this.tableWrap = { card, table, tbody, startInput, endInput };

    filterBtn.addEventListener("click", () => {
      localStorage.setItem(`${this.schema.storageKey}_filterStart`, startInput.value);
      localStorage.setItem(`${this.schema.storageKey}_filterEnd`, endInput.value);
      this.refresh();
    });

    this.refresh();
  }

  refresh() {
    const data = this.storage.get(this.schema.storageKey);
    const { tbody } = this.tableWrap;
    tbody.innerHTML = "";

    const start = localStorage.getItem(`${this.schema.storageKey}_filterStart`);
    const end = localStorage.getItem(`${this.schema.storageKey}_filterEnd`);

    const dateKey = this.schema.storageKey === "bazaar" ? "tanggalMulai" : "tanggal";
    const filtered = data.filter(item => {
      const dateStr = item[dateKey];
      return Utils.inDateRange(dateStr, start, end) || (!start && !end);
    });

    filtered.forEach(item => {
      const tr = document.createElement("tr");
      this.schema.tableColumns.forEach(col => {
        const td = document.createElement("td");
        const val = item[col.key];
        td.textContent = typeof col.format === "function" ? col.format(val) : String(val ?? "");
        tr.appendChild(td);
      });

      const actionTd = document.createElement("td");
      const actions = document.createElement("div");
      actions.className = "row-actions";

      const editBtn = document.createElement("button");
      editBtn.className = "btn"; editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => this.onEdit(item));

      const delBtn = document.createElement("button");
      delBtn.className = "btn danger"; delBtn.textContent = "Hapus";
      delBtn.addEventListener("click", () => {
        if (confirm("Hapus data ini?")) {
          this.storage.delete(this.schema.storageKey, item.id);
          this.refresh();
          if (typeof this.onDelete === "function") this.onDelete();
        }
      });

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
      actionTd.appendChild(actions);
      tr.appendChild(actionTd);
      tbody.appendChild(tr);
    });
  }
}

/* ========================== Chart Builder ================== */
class DailyChartBuilder {
  constructor(ctx, label = "Data", provider) {
    this.ctx = ctx; this.label = label; this.provider = provider;
    this.chart = null;
  }

  build() {
    const { labels, values, colors } = this.provider();
    if (this.chart) this.chart.destroy();
    this.chart = new Chart(this.ctx, {
      type: "pie",
      data: {
        labels,
        datasets: [{
          label: this.label,
          data: values,
          backgroundColor: colors,
          borderColor: "#fff",
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "bottom" },
          tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw}` } }
        },
        animation: { animateRotate: true, animateScale: true }
      }
    });
  }

  refresh() { this.build(); }
}

/* ========================== Renderer ======================= */
function renderSection(key) {
  const view = document.getElementById(key);
  if (!view) return;

  if (view.dataset.rendered === "true") return;
  view.dataset.rendered = "true";

  const schema = Schema[key];
  view.innerHTML = "";

  const grid = document.createElement("div");
  grid.className = "grid two";

  // Form
  const formContainer = document.createElement("div");
  const form = new FormBuilder(schema, storage, () => {
    // onChange: refresh section table (via tableRegistry), overview, charts
    const tbl = tableRegistry[schema.storageKey];
    if (tbl) tbl.refresh();
    refreshOverview();
    refreshCharts();
  });
  form.render(formContainer);
  formsRegistry[schema.storageKey] = form;

  // Table
  const tableContainer = document.createElement("div");
  const table = new TableBuilder(schema, storage,
    (item) => {
      // Edit via form only: fill form and switch view to section
      form.fill(item);
      document.querySelectorAll(".view").forEach(v => v.classList.remove("show"));
      view.classList.add("show");
      document.querySelectorAll(".menu-item").forEach(m => m.classList.remove("active"));
      const menuBtn = document.querySelector(`.menu-item[data-target="${key}"]`);
      if (menuBtn) menuBtn.classList.add("active");
    },
    () => { refreshOverview(); refreshCharts(); }
  );
  table.render(tableContainer);
  tableRegistry[schema.storageKey] = table;

  grid.appendChild(formContainer);
  grid.appendChild(tableContainer);
  view.appendChild(grid);
}

function renderDashboard() {
  ["dataOrder", "projectPanin", "irKeluar", "irMasuk", "bazaar"].forEach(renderSection);
}

/* ========================== Overview ======================= */
function refreshOverview() {
  const start = localStorage.getItem("overview_filterStart") || "";
  const end = localStorage.getItem("overview_filterEnd") || "";

  const allOrder = storage.get("dataOrder");
  const allPanin = storage.get("projectPanin");
  const allIrK = storage.get("irKeluar");
  const allIrM = storage.get("irMasuk");
  const allBazaar = storage.get("bazaar");

  const orderData = allOrder.filter(d => Utils.inDateRange(d.tanggal, start, end) || (!start && !end));
  const paninData = allPanin.filter(d => Utils.inDateRange(d.tanggal, start, end) || (!start && !end));
  const irK = allIrK.filter(d => Utils.inDateRange(d.tanggal, start, end) || (!start && !end));
  const irM = allIrM.filter(d => Utils.inDateRange(d.tanggal, start, end) || (!start && !end));
  const bz = allBazaar;

  // Update stat cards
  const totalIrK = irK.reduce((acc, cur) => acc + Number(cur.jumlahIR || 0), 0);
  const totalSkuK = irK.reduce((acc, cur) => acc + Number(cur.totalSKU || 0), 0);
  const totalQtyK = irK.reduce((acc, cur) => acc + Number(cur.totalQty || 0), 0);
  const elIrK = document.getElementById("totalIrKeluar");
  const elIrKSub = document.getElementById("totalIrKeluarSub");
  if (elIrK) elIrK.textContent = totalIrK;
  if (elIrKSub) elIrKSub.textContent = `SKU: ${totalSkuK} • Qty: ${totalQtyK}`;

  const totalIrM = irM.reduce((acc, cur) => acc + Number(cur.jumlahIR || 0), 0);
  const totalSkuM = irM.reduce((acc, cur) => acc + Number(cur.totalSKU || 0), 0);
  const totalQtyM = irM.reduce((acc, cur) => acc + Number(cur.totalQty || 0), 0);
  const elIrM = document.getElementById("totalIrMasuk");
  const elIrMSub = document.getElementById("totalIrMasukSub");
  if (elIrM) elIrM.textContent = totalIrM;
  if (elIrMSub) elIrMSub.textContent = `SKU: ${totalSkuM} • Qty: ${totalQtyM}`;

  // Bazaar active
  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
  const activeBazaar = bz.filter(b => {
    const s = new Date(b.tanggalMulai);
    const e = new Date(b.tanggalSelesai);
    return s <= weekEnd && e >= weekStart;
  }).length;
  const elBaz = document.getElementById("bazaarActive");
  if (elBaz) elBaz.textContent = activeBazaar;

  // Fill overview tables
  fillOverviewTables(irM, irK, bz);

  // Build/refresh charts with filtered data
  buildOrRefreshCharts(orderData, paninData);
}

/* ========================== Overview table rendering ======= */
function fillOverviewTables(irMasukData, irKeluarData, bazaarData) {
  // IR Masuk
  const masukData = Utils.sortByDateDesc(irMasukData, "tanggal").slice(0, 5);
  const masukTbody = document.querySelector("#overviewIrMasukTable tbody");
  if (masukTbody) {
    masukTbody.innerHTML = "";
    masukData.forEach(d => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${Utils.humanDate(d.tanggal)}</td>
        <td>${d.jumlahIR ?? 0}</td>
        <td>${d.warehouseDest ?? "-"}</td>
        <td>${d.totalSKU ?? 0}</td>
        <td>${d.totalQty ?? 0}</td>
        <td>${d.keterangan ?? "-"}</td>
      `;
      masukTbody.appendChild(tr);
    });
    ensureTableHeader("#overviewIrMasukTable", ["Tanggal","Jumlah IR","Warehouse","SKU","Qty","Keterangan"]);
  }

  // IR Keluar
  const keluarData = Utils.sortByDateDesc(irKeluarData, "tanggal").slice(0, 5);
  const keluarTbody = document.querySelector("#overviewIrKeluarTable tbody");
  if (keluarTbody) {
    keluarTbody.innerHTML = "";
    keluarData.forEach(d => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${Utils.humanDate(d.tanggal)}</td>
        <td>${d.jumlahIR ?? 0}</td>
        <td>${d.warehouseDest ?? "-"}</td>
        <td>${d.totalSKU ?? 0}</td>
        <td>${d.totalQty ?? 0}</td>
        <td>${d.keterangan ?? "-"}</td>
      `;
      keluarTbody.appendChild(tr);
    });
    ensureTableHeader("#overviewIrKeluarTable", ["Tanggal","Jumlah IR","Warehouse","SKU","Qty","Keterangan"]);
  }

  // Bazaar
  const bazaarTbody = document.querySelector("#overviewBazaarTable tbody");
  if (bazaarTbody) {
    const bz = Utils.sortByDateDesc(bazaarData, "tanggalMulai").slice(0, 8);
    bazaarTbody.innerHTML = "";
    bz.forEach(d => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${d.namaProject ?? "-"}</td>
        <td>${Utils.humanDate(d.tanggalMulai)}</td>
        <td>${Utils.humanDate(d.tanggalSelesai)}</td>
        <td>${d.keterangan ?? "-"}</td>
      `;
      bazaarTbody.appendChild(tr);
    });
    ensureTableHeader("#overviewBazaarTable", ["Project","Mulai","Selesai","Keterangan"]);
  }
}

function ensureTableHeader(selector, headers) {
  const table = document.querySelector(selector);
  if (!table) return;
  const thead = table.querySelector("thead");
  if (!thead) {
    const th = document.createElement("thead");
    const tr = document.createElement("tr");
    headers.forEach(h => { const thc = document.createElement("th"); thc.textContent = h; tr.appendChild(thc); });
    th.appendChild(tr);
    table.insertBefore(th, table.firstChild);
    return;
  }
  const existing = Array.from(thead.querySelectorAll("th")).map(t => t.textContent.trim());
  if (existing.length !== headers.length || !headers.every((h,i) => existing[i] === h)) {
    thead.innerHTML = "";
    const tr = document.createElement("tr");
    headers.forEach(h => { const thc = document.createElement("th"); thc.textContent = h; tr.appendChild(thc); });
    thead.appendChild(tr);
  }
}

/* ========================== Charts + small tables =============== */
let orderPie = null, paninPie = null;

function buildOrRefreshCharts(orderDataFiltered, paninDataFiltered) {
  const orderCtx = document.getElementById("orderPie");
  const paninCtx = document.getElementById("paninPie");
  if (!orderCtx || !paninCtx) return;

  const orderProvider = () => {
    const totalSO = orderDataFiltered.reduce((acc, d) => acc + Number(d.soRelease || 0), 0);
    const totalDone = orderDataFiltered.reduce((acc, d) => acc + Number(d.doneSO || 0), 0);
    const pending = Math.max(0, totalSO - totalDone);
    return { labels: ["Done", "Pending"], values: [totalDone, pending], colors: ["#10b981", "#f59e0b"] };
  };

  const paninProvider = () => {
    const totalSO = paninDataFiltered.reduce((acc, d) => acc + Number(d.soRelease || 0), 0);
    const totalDone = paninDataFiltered.reduce((acc, d) => acc + Number(d.doneSO || 0), 0);
    const pending = Math.max(0, totalSO - totalDone);
    return { labels: ["Done", "Pending"], values: [totalDone, pending], colors: ["#10b981", "#f59e0b"] };
  };

  try { if (orderPie && orderPie.chart) orderPie.chart.destroy(); } catch(e){}
  try { if (paninPie && paninPie.chart) paninPie.chart.destroy(); } catch(e){}

  orderPie = new DailyChartBuilder(orderCtx, "Data Order", orderProvider);
  paninPie = new DailyChartBuilder(paninCtx, "Project Bank Panin", paninProvider);
  orderPie.build();
  paninPie.build();

  // remove old small tables then render new ones
  const parentOrder = orderCtx.parentNode;
  const oldOrderSmall = parentOrder.querySelector("#orderSmallTable");
  if (oldOrderSmall) oldOrderSmall.remove();
  const parentPanin = paninCtx.parentNode;
  const oldPaninSmall = parentPanin.querySelector("#paninSmallTable");
  if (oldPaninSmall) oldPaninSmall.remove();

  renderSmallOrderTable(orderCtx, orderDataFiltered, "orderSmallTable", "dataOrder");
  renderSmallOrderTable(paninCtx, paninDataFiltered, "paninSmallTable", "projectPanin");
}

/* small table for order/panin under pie: read-only rows but clickable to open form */
function renderSmallOrderTable(canvas, data, idSuffix, storageKey) {
  const parent = canvas.parentNode;
  const existing = parent.querySelector(`#${idSuffix}`);
  if (existing) existing.remove();

  const small = document.createElement("table");
  small.className = "table small";
  small.id = idSuffix;

  const rows = Utils.sortByDateDesc(data, "tanggal").slice(0, 5);
  small.innerHTML = `
    <thead>
      <tr>
        <th>Tanggal</th><th>SO Release</th><th>Done SO</th><th>% Done</th><th>Keterangan</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map(r => `
        <tr data-id="${r.id}">
          <td>${Utils.humanDate(r.tanggal)}</td>
          <td>${r.soRelease ?? 0}</td>
          <td>${r.doneSO ?? 0}</td>
          <td>${r.percentDone ?? 0}%</td>
          <td>${(r.keterangan ?? "-").toString().slice(0, 120)}</td>
        </tr>
      `).join("")}
    </tbody>
  `;
  parent.appendChild(small);

  // klik baris -> buka form terkait dan isi data (edit via form)
  small.querySelectorAll("tbody tr").forEach(tr => {
    tr.style.cursor = "pointer";
    tr.addEventListener("click", () => {
      const id = tr.dataset.id;
      const list = storage.get(storageKey);
      const item = list.find(x => x.id === id);
      if (!item) return;
      const form = formsRegistry[storageKey];
      if (!form) return;
      form.fill(item);
      // switch view to section
      document.querySelectorAll(".view").forEach(v => v.classList.remove("show"));
      const viewEl = document.getElementById(storageKey);
      if (viewEl) viewEl.classList.add("show");
      // highlight menu
      document.querySelectorAll(".menu-item").forEach(m => m.classList.remove("active"));
      const menuBtn = document.querySelector(`.menu-item[data-target="${storageKey}"]`);
      if (menuBtn) menuBtn.classList.add("active");
    });
  });
}

/* ========================== Charts refresh ================= */
function refreshCharts() {
  const start = localStorage.getItem("overview_filterStart") || "";
  const end = localStorage.getItem("overview_filterEnd") || "";
  const orderData = storage.get("dataOrder").filter(d => Utils.inDateRange(d.tanggal, start, end) || (!start && !end));
  const paninData = storage.get("projectPanin").filter(d => Utils.inDateRange(d.tanggal, start, end) || (!start && !end));
  buildOrRefreshCharts(orderData, paninData);
}

/* ========================== Navigation ===================== */
function setupNavigation() {
  const items = Array.from(document.querySelectorAll(".menu-item"));
  items.forEach(btn => {
    btn.addEventListener("click", () => {
      items.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const target = btn.dataset.target;
      Array.from(document.querySelectorAll(".view")).forEach(v => v.classList.remove("show"));
      document.getElementById(target).classList.add("show");
    });
  });

  const sb = document.querySelector(".sidebar");
  const toggle = document.getElementById("sidebarToggle");
  if (toggle) toggle.addEventListener("click", () => sb.classList.toggle("collapsed"));
}

/* ========================== Overview Filter (Navbar) ======= */
function setupOverviewFilter() {
  const startInput = document.getElementById("overviewStart");
  const endInput = document.getElementById("overviewEnd");
  const btn = document.getElementById("overviewFilterBtn");

  if (startInput) startInput.value = localStorage.getItem("overview_filterStart") || "";
  if (endInput) endInput.value = localStorage.getItem("overview_filterEnd") || "";

  if (btn) {
    btn.addEventListener("click", () => {
      localStorage.setItem("overview_filterStart", startInput.value);
      localStorage.setItem("overview_filterEnd", endInput.value);
      refreshOverview();
    });
  }
}

/* ========================== Auto Refresh Daily ============= */
function setupDailyRefresh() {
  const todayText = document.getElementById("todayText");
  const updateDate = () => {
    const now = new Date();
    const str = now.toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" });
    if (todayText) todayText.textContent = str;
  };
  updateDate();
  setInterval(updateDate, 60 * 1000);

  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      refreshOverview();
      refreshCharts();
    });
  }

  const scheduleMidnight = () => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 0, 0);
    const ms = next - now;
    setTimeout(() => {
      refreshOverview();
      refreshCharts();
      scheduleMidnight();
    }, ms);
  };
  scheduleMidnight();
}

/* ========================== Boot =========================== */
document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  renderDashboard();
  setupOverviewFilter();
  refreshOverview();
  refreshCharts();
  setupDailyRefresh();

  const overview = document.getElementById("overview");
  if (overview) overview.classList.add("show");

  const orderCanvas = document.getElementById("orderPie");
  const paninCanvas = document.getElementById("paninPie");
  [orderCanvas, paninCanvas].forEach(c => { if (c) c.style.maxHeight = "160px"; });
});
