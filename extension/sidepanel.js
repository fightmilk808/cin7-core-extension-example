const $ = (id) => document.getElementById(id);

async function activeCin7Tab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.startsWith('https://inventory.dearsystems.com/')) {
    throw new Error('Switch to a signed-in Cin7 Core tab first.');
  }
  return tab;
}

function render(rows) {
  const table = $('out');
  table.replaceChildren();
  if (!rows.length) { table.hidden = true; return; }
  const cols = Object.keys(rows[0]).slice(0, 4); // first few columns is enough for a demo
  const head = table.insertRow();
  cols.forEach((c) => { const th = document.createElement('th'); th.textContent = c; head.append(th); });
  rows.forEach((r) => {
    const tr = table.insertRow();
    cols.forEach((c) => { tr.insertCell().textContent = r[c] ?? ''; }); // textContent: never innerHTML
  });
  table.hidden = false;
}

// Hook for later: send rows somewhere (your own API, a sheet, a database).
// Left empty on purpose so the example has no backend.
async function sink(_name, _rows) {}

$('load').addEventListener('click', async () => {
  $('status').textContent = 'Loading…';
  try {
    const tab = await activeCin7Tab();
    const res = await chrome.tabs.sendMessage(tab.id, { type: 'cin7:read', name: 'mrpRuns' });
    if (!res?.ok) throw new Error(res?.error || 'No reply from the page. Reload the Cin7 tab.');
    render(res.rows);
    await sink('mrpRuns', res.rows);
    $('status').textContent = `${res.rows.length} rows${res.total != null ? ` of ${res.total}` : ''}`;
  } catch (e) {
    $('status').textContent = e.message;
  }
});
