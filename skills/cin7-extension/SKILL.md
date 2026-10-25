---
name: cin7-extension
description: Build or extend a Chrome (Manifest V3) extension that reads Cin7 Core (DEAR Inventory) through the user's signed-in browser session, starting from the cin7-core-extension-example starter. Use when someone wants a Cin7 side panel, a Cin7 lookup or export tool in the browser, to add a dataset or endpoint to the starter, or to show web-app-only Cin7 data such as MRP runs.
---

# Cin7 extension

Start from this repo's `extension/` folder. Its shape is the contract; keep it.

| File | Owns |
|---|---|
| `content.js` | The only code that talks to Cin7. `DATASETS` allow-list, `GET` only, 300 ms between calls. |
| `sidepanel.js` | UI: dataset picker, search, filter, columns, paging, links, CSV. `sink()` is the one place rows may leave. |
| `manifest.json` | `sidePanel`, `activeTab`, one host. Keep it that small. |

## Add a dataset

1. Find a read endpoint. Use the map: the `cin7-core` MCP server's `search_operations` with `source: "web"` and `reads_only: true`, or a module `README.md` in cin7-core-rebuild. Each lists verb, read/write marking, parameters and the key rows come back under (`root`).
2. Add one entry to `DATASETS` in `content.js`: `path`, `root`, `search` (if it takes `search`), `params` (fixed query values), `page` (Cin7 page for links, e.g. `/Product#`). The picker shows it on its own.
3. Reload the extension, then reload the Cin7 tab, and try it.

## Rules

1. **GET only.** Cin7 stores often save on the same URL they read from. If the map marks an endpoint write, or lists only `POST`, leave it out. A `POST` that the map marks as a read still sends a body; don't add it to this starter without a person agreeing.
2. **Never `innerHTML`.** Cin7 data is user-entered; render with `textContent`.
3. **No new permissions or hosts** unless the person asks, and say why.
4. **Nothing leaves the browser** except through `sink()`, and only to a place the person names.
5. **One web session per login.** Test in the browser the person already uses; don't sign in from a second one.
6. **No tenant data in commits.** Screenshots and fixtures use invented rows.

## When it fails

| Symptom | Cause |
|---|---|
| "No reply from the page" | Content script not attached: reload the Cin7 tab after reloading the extension. |
| 404 / 405 | Wrong path, or the store needs `page`/`start`/`limit` (already sent). |
| HTML instead of JSON, or a login page | Session expired: sign in again in that tab. |
| Empty table, `total` > 0 | Wrong `root` key: check the map. |
