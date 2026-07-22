---
title: Plugins and Metadata Scraping
permalink: /user-guide/plugins/
createTime: 2026/07/22 13:30:00
---

# Plugins and Metadata Scraping

Plugins extend ML-Maid with metadata scrapers: instead of typing a game's details by hand, you search a website (such as [VNDB](https://vndb.org)) from inside the add/edit form and apply the results — title, developer, release date, score, tags, description, cover, and background — with a couple of clicks.

Official plugins are published in the [ML-Maid_Plugins](https://github.com/Kurosu-Ti01/ML-Maid_Plugins) repository.

## Installing a plugin

Open **Settings → Plugins**. Two ways to install:

- **Import a zip (recommended).** Click **Import Plugin** and pick the plugin's `.zip` file. ML-Maid validates and unpacks it automatically; importing a newer zip of the same plugin upgrades it in place.
- **Manual copy.** Click **Open Plugins Folder**, drop the plugin's folder (containing `manifest.json` and its script) inside, then click **Refresh**.

A newly installed plugin is enabled immediately — no restart needed.

::: warning Install only plugins you trust
A plugin is JavaScript written by its author and can request any public website through ML-Maid. Stick to the official repository or authors you trust; a plugin's `main.js` is plain readable code if you want to check what it does.
:::

## Managing plugins

Each row in the Plugins list shows the plugin's name, version, and type, with:

- **Enable switch** — a disabled plugin stays installed but disappears from the scraper's source list. Plugins marked *Unsupported* (built for a different ML-Maid version) cannot be enabled.
- **Delete button** — uninstalls the plugin by removing its folder, after a confirmation.
- **Refresh** — re-reads the plugins folder; use it after editing or manually copying files.

## Scraping metadata

1. Open the **Add Game** form (or **Edit** an existing game) and type the game's title.
2. Click the **Scrape** button next to the title field.
3. Pick a source (if you have several scraper plugins), adjust the search text, and hit **Search**.
4. Click the matching candidate in the result list.
5. On the preview screen, tick the fields you want to apply. For the background image, pick one of the offered screenshots — or untick Background to keep your own.
6. Click **Apply**. Fields land in the form; the cover and background are downloaded and shown in the **Media** tab, where you can still crop them.

Nothing is saved to your library until you press **Save** on the form — closing it discards the scraped images. When editing an existing game, list fields such as tags merge with what you already have instead of replacing it.

::: tip
The three **Add from URL** buttons in the Media tab use the same download machinery: paste any direct image link to set an icon, background, or cover without a scraper.
:::
