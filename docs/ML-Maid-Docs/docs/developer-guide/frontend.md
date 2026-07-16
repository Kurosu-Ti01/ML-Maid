---
title: Frontend Implementation
permalink: /developer-guide/frontend/
createTime: 2026/07/15 23:31:25
---

# Frontend Implementation

## State and pages

The page store holds `list | statistics | settings`. The game store owns the lightweight list, selected UUID, full details, loading state, and errors. It reloads data after `game-store-changed` and valid session events. The modal store controls add and edit dialogs.

The list request contains only display, filtering, and sorting fields; selection triggers `getGameById` for the full object. Formatting helpers turn millisecond timestamps into local text. The adapter resolves relative image paths against the app data directory and converts them into Tauri asset URLs.

## Forms and images

Forms contain General, Advanced, Media, Links, Actions, and Script tabs. Metadata options come from lookup tables and permit new values. Image selection calls `processGameImage`: the backend copies or extracts an image into a temporary directory and returns a preview. Save finalizes images inside the CRUD command; Cancel calls `cleanupTempImages`.

## Search, settings, and statistics

Search filters titles client-side. Filtering and sorting are persisted in `Settings`, then applied by the game store. `useTheme` updates the DOM for light, dark, or automatic mode. Vue I18n changes the UI language; saving settings causes Rust to rebuild translated tray labels.

Statistics tabs call separate aggregation endpoints and format seconds before passing datasets to ECharts. The Day tab also loads individual sessions; Week, Month, and Year use ISO-week, year/month, and daily-year datasets.

Keep keys synchronized across `en-US.json`, `zh-CN.json`, and `ja-JP.json`. Do not manually maintain generated `components.d.ts` or `auto-imports.d.ts`.

