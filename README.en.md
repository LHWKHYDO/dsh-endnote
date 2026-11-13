# dsh-endnote

[English](README.md) | 简体中文

A literature-research plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness): **search your local EndNote library first, then read the original PDF**. When you ask for papers on a topic, the model queries your local EndNote library and opens the matching PDF in the DSH right sidebar, so you can read and ask follow-up questions side by side.

- **Read-only**: the EndNote library is never written to; index artifacts stay inside the plugin's own data directory.
- **Local first, web second**: the injected system prompt requires `endnote_search` before any web search. Only on a local miss does the model look up the canonical title/DOI online, re-query the library with those fields, and finally list web candidates if still unmatched.
- **Open what you found**: `endnote_open` verifies the PDF exists and hands it to the host PDF viewer — only for results opened in the current session.
- **Sidebar panel**: library overview with totals, recent reads / recently added (choose count, or one/both lists), and one-click refresh; a title opens that PDF in the sidebar, a folder opens your file manager.

## How it works

```
user asks for literature
        │
        ▼
injected system prompt ──► call endnote_search first, never search the web first
        │
        ▼
  endnote_search ── hit ──► title + groups + abstract + local PDF path
        │
        ▼
  endnote_open(path) ── verify file exists ──► meta {plugin, path, open}
        │
        ▼
client half ──► open the file in the right sidebar with the host PDF viewer
```

## Requirements

- DSH desktop app or `dsh web` (the right sidebar and plugin settings page are needed for the full experience; plain CLI still gets the tools)
- EndNote installed locally, with a `…Data` library folder
- Python 3 (only for rebuilding the index with `endnote_rebuild`)
- Node.js 18+ (to run the plugin and its tests); no build step

## Install

```sh
git clone https://github.com/LHWKHYDO/dsh-endnote.git
```

**The repo vendors `vendor/` (a copy of schemastery and its deps): there are no npm dependencies, no `npm install`, and no network access needed** — clone and install. This exists for offline/new machines: installing from the repo used to pull `@deepseek-ai/schemastery` from the npm registry, and an unreachable registry or missing version surfaced as an "incompatible version / no matching version" error.

Then install that folder from the DSH sidebar → Plugins → plugin manager (equivalent to `plugin_manager` `install_bundle` with `target` set to the repo path). Hard-refresh the browser afterwards (Ctrl+Shift+R). A `dsh-endnote` card appears on the Plugins page, plus an entry in the sidebar navigation.

> Compatibility: the plugin declares no `engines.dsh` and no DSH package peer dependencies, so DSH's version compatibility check never blocks it; any DSH build with the plugin manager and sidebar works.

### First run

1. Sidebar → `dsh-endnote` → settings → **Add** your `My EndNote Library.Data` folder → click **Switch**.
2. Run `endnote_rebuild` once to build the index (or run `python scripts/endnote_index.py --lib "<library>.Data" --out "<plugin>/.data/endnote_index.json"` manually).
3. Check `endnote_status` for entry count / PDF count.

## Configuration

Configuration lives in the plugin entry's `config` (`cordis.patch.yml`); the graphical settings page is recommended. All fields are volatile — **saved changes apply immediately, no restart**.

| Key | Default | Description |
| --- | --- | --- |
| `libraryPath` | `~/Documents/My EndNote Library.Data` | Active library root (`…Data`), read-only; **Switch** in the settings page changes it |
| `libraries` | `[]` | Saved libraries, each `{name, path}`; the first is primary; add / remove / set primary / switch |
| `indexFile` | empty | Index file (`.json` / `.csv`). Empty = per-library index `endnote_index_<key>.json` → legacy single file in data dir → legacy candidates |
| `dataDir` | `<plugin>/.data` | Directory for indexes, read log and cache |
| `pythonPath` | `python` | Interpreter used by `endnote_rebuild` |
| `openInSidebar` | `true` | Auto-open the PDF in the right sidebar on a hit |
| `limit` | `8` | Default number of results per search |

**Multiple libraries**: each library has its own index. The first switch to a library without an index just needs one `endnote_rebuild`; afterwards switching is instant. Paths in the index are re-joined against the current `libraryPath`, so moving a library only needs a config change — no rebuild.

## Tools

| Tool | Purpose |
| --- | --- |
| `endnote_search` | Search the local library. Multiple keywords are AND, covering title / authors / year / journal / keywords / DOI / type / groups / attachment path / abstract; supports `group` filtering and `read=read/unread`, and shows read state and rating per hit |
| `endnote_open` | Verify the PDF exists and open it in the right sidebar (path only when `openInSidebar=false`); successful opens are logged |
| `endnote_recent` | Recently read table (newest first): title / read state / rating / last-read time / local folder; data = open log + EndNote read-state timestamps |
| `endnote_status` | Library path, saved libraries, index file, entry count, read count, PDF count, auto-open flag |
| `endnote_config` | Write plugin config through the host `configEditor`; applies immediately |
| `endnote_rebuild` | Run `scripts/endnote_index.py` to rebuild the index and reconcile registered vs on-disk PDFs |

## Sidebar panel

The `dsh-endnote` panel page starts with a dashboard and the settings form below it:

- **Totals**: total entries / with PDF / read / unread / unmarked / rated / groups + index timestamp.
- **Recent reads**: count 5/10/20/50; each row shows title, read state, rating and last-read time; clicking a title reopens that PDF in the sidebar (so a closed tab can be restored from here), and clicking the folder path opens the containing folder in your file manager.
- **Recently added**: the **Show** dropdown selects *Recent reads / Recently added / Both*, ordered by EndNote import time.
- **New-tab entry**: the sidebar's “+ New tab” guide has an *EndNote Recent Reads* page — click it to list recently read papers without opening any PDF first; a title opens it in the EndNote PDF tab. A same-named card also appears on the Start page and in the “More tools” menu.
- **Refresh**: re-fetch the displayed data (read log and read-state changes appear right away; newly imported papers need an `endnote_rebuild` to enter the totals).
- **Sidebar entry**: the page top shows the sidebar-entry state; when registered you can open the panel, and when missing (client half loaded later than the page) you can pin it to the sidebar or reload the page. Once registered, the entry persists across restarts.

Data flows over same-origin routes — `GET /dsh-endnote/panel-data`, `POST /dsh-endnote/open-folder`, `GET|HEAD /dsh-endnote/pdf-bytes?path=<absolute>` (Range-capable; the editor pulls PDF bytes itself instead of waiting for the host to inject them), `GET|POST /dsh-endnote/pdf-annotations`, `POST /dsh-endnote/export-pdf` and `GET /dsh-endnote/vendor/pdfjs/*` — registered the same way as the official open-in-app: every request passes the host `connection` Host/Origin fence, folder opening only accepts absolute paths to real directories, and the byte/annotation routes only accept absolute `.pdf` paths. If `webServer` / `connection` is missing the routes degrade silently; the six tools are unaffected.

## PDF editor

- **Colour picker**: toolbar / selection floater / context menu / settings share one swatch component — an inline “current colour square” that opens a popup with 7 common quick colours plus the native picker; it closes when you click outside. The three settings rows (highlight / box / note text) use the same aligned style.
- **Buttons**: Save and Export are icon buttons with hover tooltips; the clock icon toggles the saved-status / annotation-count display (the settings panel can also toggle the saved hint separately).
- **Canvas**: with the default tool the blank area is a grab hand (drag to pan) and turns into text selection over text — drag-select to highlight; hold Space to force the hand; arrow keys move the canvas and `PageUp`/`PageDown` turn pages; a settings toggle binds W/S to vertical canvas scrolling.

## Index

`scripts/endnote_index.py` does three things only: open `sdb/sdb.eni` read-only (SQLite, `mode=ro&immutable=1`) to read references, groups, attachment mapping, read state, ratings and timestamps; scan the `PDF/` directory read-only for reconciliation; write the result as one JSON file.

```sh
python scripts/endnote_index.py --lib "<library>.Data" --out "<plugin>/.data/endnote_index.json"
```

## Privacy

- The EndNote library is **read-only**; the index script opens the database with `immutable=1` and performs no writes.
- Apart from your normal conversation with the model, the plugin **sends no data anywhere**; searching, opening and the panel are all local.
- The index and read log under `.data/` contain local absolute paths and reference metadata — **excluded by `.gitignore`**; do not commit them.

## Known limitations

- The client half depends on the `sidebarRight` and `sessions` services; when missing it degrades quietly (one warning) and the tools still work.
- Opening the same PDF again focuses the existing tab (host default dedupe).
- Auto-open only applies to `endnote_open` calls made in the current session; past sessions are not replayed.

## Development

Plain JavaScript, no build step. Tests use Node's built-in runner:

```sh
node test/core.test.mjs
node test/tools.test.mjs
node test/client.test.mjs
# or npm test (requires an environment that can spawn child processes)
```

## License

MIT
