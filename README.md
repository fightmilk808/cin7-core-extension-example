# Cin7 Core extension example

A small working Chrome extension for Cin7 Core: a side panel that reads allow-listed endpoints through your own
signed-in session and shows the rows. It is a backbone to copy, not a product. Point your own coding agent at it, together
with the [Cin7 Core rebuild map](https://github.com/fightmilk808/cin7-core-rebuild), and ask for the extension you want.

## What it does

- Pick a dataset: MRP runs, products or suppliers (three `GET` reads from the map).
- Search in Cin7 (the endpoint's own `search` parameter), then filter the loaded rows as you type.
- Load more, 25 rows at a time.
- Choose which columns to show; the table starts with the first five.
- Number, name and SKU cells link back to the record in Cin7.
- Download what you see as CSV.

## What's in it

| File | Job |
|---|---|
| [extension/manifest.json](extension/manifest.json) | Manifest V3. Only `sidePanel` and `activeTab`, plus the one Cin7 host. |
| [extension/content.js](extension/content.js) | Runs on `inventory.dearsystems.com`. The only file that talks to Cin7: a `GET`-only reader with a `DATASETS` allow-list (one entry per endpoint) and a 300 ms gap between calls. |
| [extension/sidepanel.html](extension/sidepanel.html), [sidepanel.js](extension/sidepanel.js), [sidepanel.css](extension/sidepanel.css) | The UI. Asks the page for rows, draws the table, handles search, filter, columns, paging and CSV. Has an empty `sink()` where your own storage or API would go. |
| [extension/background.js](extension/background.js) | Opens the side panel when you click the toolbar icon. |

```
side panel  --chrome.tabs.sendMessage-->  content script  --fetch (your cookie)-->  Cin7
   (UI)      <------ { ok, rows, total } ---   (allow-list)  <------ JSON ----------
```

## Try it

1. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, choose the [extension/](extension/) folder.
2. Sign in to Cin7 Core in a tab and leave that tab active.
3. Click the extension icon, choose a dataset and press **Load**.

After editing the code, press the reload icon on the extension's card, then reload the Cin7 tab so the new content script attaches.

MRP runs is the one checked against a live tenant. Products and suppliers use the endpoints and `/Product#<id>`, `/Supplier#<id>` links from the map's naming pattern; if a call answers 404 or 405, or a link doesn't open the record, adjust that entry in `DATASETS`.

## Ask your agent to build on it

Paste something like this into your agent, inside a clone of this repo, with the rebuild map checked out beside it:

> Extend the extension in `extension/`. Use `../cin7-core-rebuild` to find the Cin7 internal endpoints (each module's
> `README.md` lists them with verb and read/write marking; `docs/INTERNAL-API.md` explains the conventions).
> Add a new read endpoint as an entry in `DATASETS` in `content.js` (it then appears in the dataset picker on its own). Rules: GET only; never add an endpoint marked write; keep calls spaced out; render with `textContent`, never
> `innerHTML`; keep permissions and host list as small as they are now.

Ideas to ask for: a product or stock lookup, a purchase order list with links back to Cin7, a production schedule view,
a CSV export button, or filling in `sink()` to save rows to your own database.

## Ground rules

- **Read only.** The content script uses `GET` and nothing else. Cin7 stores often save with the same URL as they read
  (`POST`, `PUT`, `DELETE`), so check the map's read/write marking before you allow a path.
- **Your session, your data.** The extension uses the cookie of the person signed in. Cin7 allows one web session per login,
  so don't sign in from a second browser while testing.
- **Be gentle.** Keep the call gap, page results, and don't loop over thousands of records.
- **Nothing leaves the browser** unless you write a `sink()` that sends it.
