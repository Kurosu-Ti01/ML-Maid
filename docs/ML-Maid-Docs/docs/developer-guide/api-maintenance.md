---
title: API Reference and Maintenance
permalink: /developer-guide/api-maintenance/
createTime: 2026/07/15 23:31:25
---

# API Reference and Maintenance

## BackendApi and commands

| Area | Frontend methods | Tauri command or capability |
| --- | --- | --- |
| Games | `getGameById`, `getGamesList`, `addGame`, `updateGame`, `deleteGame` | matching snake_case commands |
| Metadata | `getAllGenres/Developers/Publishers/Tags` | matching `get_all_*` commands |
| Launch | `launchGame`, `detectLocaleEmulator` | `launch_game`, `detect_locale_emulator` |
| Selection | `selectExecutableFile`, `selectFolder`, `selectImageFile` | dialog plugin |
| External | `openExternalLink`, `openFolder` | opener plugin |
| Images | `processGameImage`, `finalizeGameImages`, `cleanupTempImages` | matching commands |
| Settings | `getSettings`, `saveSettings` | `settings_get`, `settings_save` |
| Statistics | eleven stats/session methods | commands in `stats_manager` |

Statistics covers recent game days, game date ranges, week-by-date, daily sessions, monthly daily totals, yearly daily totals, overall totals, top games, monthly summaries, recent sessions, and launch methods. Dates use `YYYY-MM-DD`, timestamps use milliseconds, and durations use seconds.

## Events

| Event | Main payload | Purpose |
| --- | --- | --- |
| `game-store-changed` | `action`, optional `game` | Refresh after CRUD |
| `game-launched` | `gameUuid` | Mark a game running |
| `game-session-ended` | UUID, session ID, duration, total, start/end | Refresh valid-session data |
| `game-stopped` | `gameUuid` | Clear running state, including invalid sessions |

Every subscription returns an unsubscribe callback; components must call it during unmount.

## Known limitations and checklist

- Shortcut creation, game information, save backup, and Script remain placeholders.
- File parameters are absent from `LaunchParams`; Play selects only the first File action.
- Folder monitoring is the best-maintained mode.
- A new feature must update all three locale files, `BackendApi`, command registration, both user guides, both developer guides, and relevant screenshots.
- Before release, run the frontend build, Rust test/fmt, VuePress build, and a bilingual structure check.

## 0.5.0 feature coverage

| Implemented capability | User guide | Implementation guide |
| --- | --- | --- |
| Installation, portable mode, legacy upgrade | Getting Started | Storage, Migration, and Release |
| Game CRUD, metadata, many-to-many tags | Managing the Library | Frontend and Backend |
| Icon, cover, background, temporary images | Managing the Library | Frontend and Backend |
| Links, file actions, search, filters, sorting | Managing the Library | Frontend and API Reference |
| Direct, Locale Emulator, and Basic launch | Launching and Playtime | Backend |
| File/Folder/Process monitoring and finalization | Launching and Playtime | Backend |
| Overview, day, week, month, year statistics | Statistics | Frontend and Backend |
| Theme, language, tray, settings persistence | Settings | Frontend and Storage |
| Data paths, migrations, release artifacts | Getting Started | Storage, Migration, and Release |
