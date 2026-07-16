---
title: Storage, Migration, and Release
permalink: /developer-guide/storage-release/
createTime: 2026/07/15 23:31:25
---

# Storage, Migration, and Release

## Data files

`metadata.db` stores the `games` row and four many-to-many metadata families. Artwork paths and JSON fields hold links, descriptions, actions, and process names. Each `statistics.db` row represents a launch session with times, duration, method, exit code, calendar dimensions, and completion state. Settings are stored in `config/settings.conf`.

Development builds use the repository root. Installed builds use `Documents\ML-Maid`; portable builds use the executable directory. Installed detection checks for an uninstaller or a location under Program Files.

## Migration

Each database has a `db_version` table. Startup migrations converge legacy Electron layouts, remove deprecated columns, add `localeEmulation`, and clean orphaned sessions that were never finalized. Destructive changes first copy a versioned backup. New migrations need tests for legacy, already-clean, and fresh databases.

## Release

`npm run build` runs Vue type checking and Vite, then `tauri build`. Tauri produces NSIS and MSI installers. `scripts/collect-artifacts.mjs` normalizes their names and packages the bare `ml-maid.exe` as a renamed portable ZIP under `release/<version>/`.

Rust tests currently cover migrations, settings defaults/compatibility, and component-wise folder matching. Add focused regression tests for launcher, database, or statistics changes, and run Cargo test plus fmt check before release.

