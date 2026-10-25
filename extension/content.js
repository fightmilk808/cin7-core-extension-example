// Runs inside inventory.dearsystems.com, so fetch() carries the user's signed-in cookie.
// This is the only file that talks to Cin7. Keep it read-only.

// Add datasets here. Find endpoints in the rebuild map: modules/<NN-module>/README.md
// (GET only; never list an endpoint the map marks as write).
//   path   the endpoint
//   root   the key the rows come back under
//   search true if the endpoint takes a `search` parameter
//   params extra query parameters sent every time
//   page   Cin7 page to open for a row: '/MRP#<id>'. Optional.
const DATASETS = {
  mrpRuns:   { label: 'MRP runs',  path: '/api/MRP_vMRP',                         root: 'root', search: true,  page: '/MRP#' },
  products:  { label: 'Products',  path: '/api/Product_Index_vProductList',       root: 'root', search: true,  params: { IsActive: true }, page: '/Product#' },
  suppliers: { label: 'Suppliers', path: '/api/SupplierList_Index_vSupplierList', root: 'root', search: true,  params: { IsActive: true }, page: '/Supplier#' },
};

const MIN_GAP_MS = 300; // be polite: space calls out
let last = 0;

async function read({ dataset, search = '', page = 1, limit = 25 }) {
  const ds = DATASETS[dataset];
  if (!ds) throw new Error(`"${dataset}" is not in the allow-list`);
  const wait = last + MIN_GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();

  const qs = new URLSearchParams({
    ...(ds.params ?? {}),
    page,
    start: (page - 1) * limit,
    limit,
  });
  if (search && ds.search) qs.set('search', search);

  const res = await fetch(`${ds.path}?${qs}`, {
    method: 'GET', // the only verb this extension uses
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const body = await res.json();
  return { rows: body[ds.root] ?? [], total: body.total ?? null };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'cin7:datasets') {
    sendResponse({
      ok: true,
      datasets: Object.entries(DATASETS).map(([key, d]) => ({
        key, label: d.label, search: !!d.search, page: d.page ?? null,
      })),
      origin: location.origin,
    });
    return;
  }
  if (msg?.type === 'cin7:read') {
    read(msg)
      .then((data) => sendResponse({ ok: true, ...data }))
      .catch((e) => sendResponse({ ok: false, error: String(e.message || e) }));
    return true; // keep the channel open for the async reply
  }
});
