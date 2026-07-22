---
title: Plugin Development
permalink: /developer-guide/plugin-development/
createTime: 2026/07/22 12:31:00
---

# Plugin Development

This guide walks you through writing a `metadata-scraper` plugin — one that lets ML-Maid search a website for a game and fill the add/edit form with its metadata. For how the system works under the hood, see [Plugin System](/developer-guide/plugin-system/). The official [vndb-scraper](https://github.com/Kurosu-Ti01/ML-Maid_Plugins) plugin is a complete, commented reference implementation.

## Quick start

A plugin is a folder containing a manifest and one script:

```
my-scraper/
├─ manifest.json
└─ main.js
```

**manifest.json**

```json
{
  "id": "my-scraper",
  "name": "My Scraper",
  "version": "1.0.0",
  "type": "metadata-scraper",
  "apiVersion": 1
}
```

**main.js** — the smallest working scraper:

```js
'use strict';

MLMaid.register({
  async search(query) {
    return [{ id: 'demo-1', title: 'Demo result for ' + query }];
  },
  async getDetails(id) {
    return { title: 'Demo Game', description: ['Hello from a plugin!'] };
  }
});
```

Put the folder into ML-Maid's `plugins/` directory (Settings → Plugins → *Open Plugins Folder* takes you there), click **Refresh**, then open the add-game form, type a title, and hit **Scrape**.

## Manifest reference

| Field | Required | Description |
| --- | --- | --- |
| `id` | ✔ | Globally unique, stable identifier (kebab-case recommended). Used for worker caching and the enable/disable state — don't change it between versions. |
| `name` | ✔ | Display name shown in the source selector and Settings. |
| `version` | ✔ | Semver string, display only. |
| `type` | ✔ | Must be `"metadata-scraper"` in API v1. Other values are listed as unsupported. |
| `apiVersion` | ✔ | Must be `1`. Incompatible versions are listed but never executed. |
| `entry` | — | Entry script file name, default `"main.js"`. Plain file name only — no subdirectories. |
| `description` | — | One-liner shown in Settings. |
| `author`, `homepage` | — | Attribution, currently informational. |

Unknown fields are ignored, so you may keep extra metadata in the manifest.

## The execution environment

Your script runs inside a **Web Worker** created from a blob URL. Practical consequences:

- **No DOM.** There is no `document`, no `DOMParser`. Parse HTML with regular expressions or string operations (see below).
- **No module system.** The script is a single classic-script file: no `import`/`export`, no `importScripts` of remote code (blocked by CSP). Everything must live in one file.
- **No direct network.** `fetch` exists in workers but is subject to browser CORS, which fails for most scrape targets — use `host.fetch` instead, which is proxied through the ML-Maid backend and has no CORS restrictions.
- **Register synchronously.** `MLMaid.register(...)` must run during the top-level execution of your script. Registering late (e.g. inside a `setTimeout` or after an `await`) fails the 5-second initialization check.
- **Budget your time.** Each `search`/`getDetails` invocation has 60 seconds; each individual `host.fetch` has 30. A call that exceeds its budget gets the worker terminated.
- Standard JavaScript built-ins are available: `JSON`, `RegExp`, `TextDecoder`, `URL`, `atob`/`btoa`, etc.

## Host API

### `host.fetch(url, options?)`

```js
const res = await host.fetch('https://api.example.com/games', {
  method: 'POST',                                // 'GET' (default) | 'POST' | 'HEAD'
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ q: 'clannad' })         // UTF-8 text only
});
```

The response is fully buffered before your code sees it, so the accessors are synchronous:

```js
res.status      // 200
res.ok          // true for 2xx
res.headers     // lowercase-keyed object, e.g. res.headers['content-type']
res.finalUrl    // URL after redirects — resolve relative links against this
res.bytes       // Uint8Array of the raw body
res.text()      // decode as UTF-8
res.text('shift_jis')  // decode with any TextDecoder label
res.json()      // JSON.parse(res.text())
```

Limits enforced by the host: `http`/`https` only, no localhost or private addresses, response bodies capped at 10 MB.

::: tip Legacy encodings
Many older VN sites serve Shift_JIS or EUC-JP. The body is transported as raw bytes precisely so you can pick the decoder: check `res.headers['content-type']` or the page's `<meta charset>` and call `res.text('shift_jis')` / `res.text('euc-jp')`.
:::

### `host.log(...args)`

Prints to the ML-Maid devtools console as `[plugin:<id>] ...`. Open devtools with right-click → Inspect in the app window. Use it freely while developing — it has no reply and costs one message.

## The metadata-scraper contract

Register exactly two async functions:

```js
MLMaid.register({ search, getDetails });
```

### `search(query) → SearchResult[]`

Called when the user hits the search button. Return up to ~20 candidates:

```ts
interface SearchResult {
  id: string            // your own identifier, passed back to getDetails
  title: string
  subtitle?: string     // original/alternative title, shown under the title
  releaseDate?: string  // 'YYYY-MM-DD', list display only
  score?: number        // 0–100, list display only
  thumbnailUrl?: string // small image for the candidate list
}
```

Entries missing `id` or `title` are silently dropped; a non-array return fails the whole search with a visible error.

### `getDetails(id) → ScrapedMetadata`

Called when the user picks a candidate. Every field is optional — return only what you actually scraped, and the UI hides the rest:

```ts
interface ScrapedMetadata {
  title?: string
  releaseDate?: string | null    // 'YYYY-MM-DD'
  developer?: string[]
  publisher?: string[]
  genre?: string[]
  tags?: string[]
  communityScore?: number        // 0–100
  description?: string[]         // plain-text paragraphs, one string each
  links?: { name: string; url: string }[]
  coverUrl?: string              // downloaded by the host as the cover
  screenshots?: { url: string; thumbnailUrl?: string }[]  // background candidates
}
```

How the host applies your data (after the user checks/unchecks fields):

- **Scalars** (`title`, `releaseDate`, `communityScore`, `description`) overwrite the form value.
- **Arrays** (`developer`, `publisher`, `genre`, `tags`) are unioned with existing values — an edited game keeps its own tags.
- **`links`** are appended, deduplicated by URL.
- **`coverUrl`** and the user-selected screenshot are downloaded server-side into the temp image slots; the user can crop them afterwards. Give full-resolution URLs here and thumbnails in `thumbnailUrl` — the UI prefers thumbnails for previews.
- Don't invent data: if the site has no genre concept, omit `genre` rather than guessing.

Throw an `Error` with a helpful message on failure (`throw new Error('Game not found: ' + id)`); the message is surfaced to the user.

## Scraping JSON APIs

The VNDB plugin is the canonical example — one helper wraps the API, and the two contract functions map fields:

```js
const API = 'https://api.vndb.org/kana/vn';

async function vndbQuery(filters, fields, results) {
  const res = await host.fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filters, fields, results })
  });
  if (!res.ok) throw new Error('VNDB API error: HTTP ' + res.status);
  return res.json();
}
```

See [vndb-scraper/main.js](https://github.com/Kurosu-Ti01/ML-Maid_Plugins) for the full field mapping, including tag filtering (content tags only, no spoilers) and description markup cleanup.

## Scraping HTML pages

Without `DOMParser`, extract with anchored regular expressions. Keep patterns tolerant of attribute order and whitespace, and decode entities yourself:

```js
async function search(query) {
  const res = await host.fetch('https://example.com/search?q=' + encodeURIComponent(query));
  const html = res.text();          // or res.text('shift_jis') for legacy sites

  const results = [];
  const re = /<a\s+href="\/game\/(\d+)"[^>]*>([^<]+)<\/a>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    results.push({ id: m[1], title: decodeEntities(m[2]) });
  }
  return results;
}

function decodeEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n));
}
```

For multi-step flows (search page → detail page), chain `host.fetch` calls inside `getDetails` — just mind the 60-second budget. Use `res.finalUrl` as the base when the site returns relative image URLs:

```js
const coverUrl = new URL(relativeSrc, res.finalUrl).href;
```

## Developing and debugging

1. **Link your working copy** into the plugins directory so edits are picked up without copying (Windows junction, no admin rights needed):

   ```bat
   mklink /J <ML-Maid data dir>\plugins\my-scraper C:\path\to\my-scraper
   ```

2. Run ML-Maid, go to **Settings → Plugins**, hit **Refresh** after every code change — workers are disposed and the script is re-read from disk. No app restart needed.
3. Sprinkle `host.log()` calls and watch the devtools console. Errors thrown from `search`/`getDetails`, HTTP failures, and timeouts all surface as messages in the scraper dialog.
4. Common failure modes:

   | Symptom | Likely cause |
   | --- | --- |
   | "did not call MLMaid.register()" | Registration is asynchronous, or a top-level exception occurred before it |
   | "plugin … crashed" | Syntax error in the script — check devtools |
   | "plugin … timed out" | Infinite loop, or a scrape flow exceeding 60 s |
   | Search error mentioning HTTP | Target rejected the request — check required headers/UA, try the URL in a browser |
   | Garbled Japanese text | Decode with `res.text('shift_jis')` (or the page's actual charset) |

## Etiquette and distribution

- **Respect the target site.** Searches are user-triggered, so v1 has no built-in rate limiter — keep request counts per action low (one for `search`, few for `getDetails`) and honor documented API limits (VNDB: 200 requests / 5 min).
- **Fail loud, not wrong.** Prefer throwing a clear error over returning half-guessed data.
- **Distribute as a zip.** Zip your plugin folder (or its contents — both layouts are accepted) and users install it via **Settings → Plugins → Import Plugin**. The target folder is named after the manifest `id`, and importing an archive with the same `id` upgrades the existing installation. Manually dropping the folder into `plugins/` still works. Official plugins are collected in [ML-Maid_Plugins](https://github.com/Kurosu-Ti01/ML-Maid_Plugins) — PRs welcome.
- Remember users are trusting your code: keep `main.js` readable and unminified so it can be reviewed.
