// Runs inside inventory.dearsystems.com, so fetch() carries the user's signed-in cookie.
// This is the only file that talks to Cin7. Keep it read-only.

// Add endpoints here. Find them in the rebuild map: modules/<NN-module>/README.md
// (GET only; never list a write endpoint).
const ALLOWED = {
  mrpRuns: { path: '/api/MRP_vMRP', root: 'root' },
};

const MIN_GAP_MS = 300; // be polite: space calls out
let last = 0;

async function readEndpoint(name, params = {}) {
  const ep = ALLOWED[name];
  if (!ep) throw new Error(`"${name}" is not in the allow-list`);
  const wait = last + MIN_GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();

  const qs = new URLSearchParams({ page: 1, start: 0, limit: 25, ...params });
  const res = await fetch(`${ep.path}?${qs}`, {
    method: 'GET', // the only verb this extension uses
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const body = await res.json();
  return { rows: body[ep.root] ?? [], total: body.total ?? null };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== 'cin7:read') return;
  readEndpoint(msg.name, msg.params)
    .then((data) => sendResponse({ ok: true, ...data }))
    .catch((e) => sendResponse({ ok: false, error: String(e.message || e) }));
  return true; // keep the channel open for the async reply
});
