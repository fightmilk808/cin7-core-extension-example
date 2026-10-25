const $ = (id) => document.getElementById(id);
const PAGE_SIZE = 25;

let tabId = null;
let origin = '';
let datasets = [];
let rows = [];
let total = null;
let page = 0;
let columns = [];   // every key seen in the rows
let shown = new Set(); // columns currently visible

const current = () => datasets.find((d) => d.key === $('dataset').value);

async function cin7Tab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.startsWith('https://inventory.dearsystems.com/')) {
    throw new Error('Switch to a signed-in Cin7 Core tab first.');
  }
  return tab;
}

async function ask(msg) {
  const res = await chrome.tabs.sendMessage(tabId, msg);
  if (!res?.ok) throw new Error(res?.error || 'No reply from the page. Reload the Cin7 tab.');
  return res;
}

function rowId(r) { return r.ID ?? r.Id ?? r.id ?? r.ProductID ?? r.SupplierID ?? null; }

function visibleRows() {
  const q = $('filter').value.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(q)));
}

function cell(r, c, ds) {
  const td = document.createElement('td');
  const v = r[c];
  const id = rowId(r);
  if (ds.page && id && (c === 'Number' || c === 'Name' || c === 'SKU' || c === 'Sku' || c === 'Code')) {
    const a = document.createElement('a');
    a.href = `${origin}${ds.page}${id}`;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = v ?? '';
    td.append(a);
  } else {
    td.textContent = v ?? ''; // textContent, never innerHTML
  }
  return td;
}

function renderTable() {
  const ds = current();
  const table = $('out');
  const list = visibleRows();
  table.replaceChildren();
  const cols = columns.filter((c) => shown.has(c));
  if (!list.length || !cols.length) { table.hidden = true; return; }
  const head = table.insertRow();
  cols.forEach((c) => { const th = document.createElement('th'); th.textContent = c; head.append(th); });
  list.forEach((r) => {
    const tr = table.insertRow();
    cols.forEach((c) => tr.append(cell(r, c, ds)));
  });
  table.hidden = false;
}

function renderColumns() {
  const box = $('cols');
  box.replaceChildren();
  columns.forEach((c) => {
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = shown.has(c);
    cb.addEventListener('change', () => { cb.checked ? shown.add(c) : shown.delete(c); renderTable(); });
    label.append(cb, ' ', c);
    box.append(label);
  });
  $('colsBox').hidden = !columns.length;
}

function renderStatus() {
  const n = visibleRows().length;
  $('status').textContent = rows.length
    ? `${n === rows.length ? rows.length : `${n} of ${rows.length}`} rows loaded${total != null ? ` (${total} in Cin7)` : ''}`
    : 'No rows.';
  $('more').hidden = total == null || rows.length >= total;
  $('csv').hidden = !rows.length;
}

async function load(append) {
  $('status').textContent = 'Loading…';
  try {
    const tab = await cin7Tab();
    tabId = tab.id;
    if (!datasets.length) {
      const meta = await ask({ type: 'cin7:datasets' });
      datasets = meta.datasets;
      origin = meta.origin;
      $('dataset').replaceChildren(...datasets.map((d) => new Option(d.label, d.key)));
    }
    if (!append) { rows = []; page = 0; }
    page += 1;
    const res = await ask({ type: 'cin7:read', dataset: $('dataset').value, search: $('search').value.trim(), page, limit: PAGE_SIZE });
    rows = rows.concat(res.rows);
    total = res.total;
    if (!append || !columns.length) {
      columns = [...new Set(rows.flatMap((r) => Object.keys(r)))];
      // Start with five readable columns; GUID-style *ID columns stay ticked-off until asked for.
      shown = new Set(columns.filter((c) => !/(^|[a-z])ID$/.test(c)).slice(0, 5));
      renderColumns();
    }
    await sink($('dataset').value, res.rows);
    renderTable();
    renderStatus();
  } catch (e) {
    $('status').textContent = e.message;
  }
}

function toCsv() {
  const cols = columns.filter((c) => shown.has(c));
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [cols.map(esc).join(','), ...visibleRows().map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}

// Hook for later: send rows somewhere (your own API, a sheet, a database).
// Left empty on purpose so the example has no backend.
async function sink(_dataset, _rows) {}

$('load').addEventListener('click', () => load(false));
$('more').addEventListener('click', () => load(true));
$('search').addEventListener('keydown', (e) => { if (e.key === 'Enter') load(false); });
$('dataset').addEventListener('change', () => { columns = []; load(false); });
$('filter').addEventListener('input', () => { renderTable(); renderStatus(); });
$('csv').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([toCsv()], { type: 'text/csv' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `${$('dataset').value}.csv` });
  a.click();
  URL.revokeObjectURL(url);
});

// Fill the dataset list as soon as the panel opens, if a Cin7 tab is active.
(async () => {
  try {
    tabId = (await cin7Tab()).id;
    const meta = await ask({ type: 'cin7:datasets' });
    datasets = meta.datasets;
    origin = meta.origin;
    $('dataset').replaceChildren(...datasets.map((d) => new Option(d.label, d.key)));
  } catch (e) {
    $('status').textContent = e.message;
  }
})();
