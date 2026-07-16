---
title: Backend Implementation
permalink: /developer-guide/backend/
createTime: 2026/07/15 23:31:25
---

# Backend Implementation

## Startup and managed state

`lib.rs` registers the single-instance, dialog, and opener plugins; resolves data paths; loads settings and both databases; and installs them as Tauri State. A second instance focuses the existing window. Window close either hides or exits according to `minimizeToTray`.

## Games and images

`game_manager` stores scalar fields in `games` and maintains genres, developers, publishers, and tags through lookup and junction tables. Mutations use transactions and emit `game-store-changed`. Deletion removes relations, library artwork, and temporary files.

`file_manager` copies regular images and extracts Windows icons from EXE, DLL, ICO, and LNK sources. Form-time files live in `temp/images/<uuid>`; save moves them into `library/images/<uuid>` and stores paths relative to the data directory. Runtime asset scope includes both library and temporary locations.

## Launch and monitoring

`launch_game` validates the executable, action name, and locale configuration before opening an unfinished statistics session. Locale Emulator delegates to LEProc; Basic mode sets Japanese environment variables.

The monitor first waits for the direct child. A process lasting 10 seconds is finalized directly. A shorter child is treated as a launcher: after 5 seconds, Folder or Process discovery finds real processes and polls every 3 seconds, with a 12-hour watchdog. Valid finalization updates the session, `games.timePlayed`, and `lastPlayed`, then emits session-ended and stopped events.

Statistics queries use SQLite `ATTACH` to join titles from metadata with the statistics database. Commands provide game ranges, daily sessions, weekly/monthly/yearly aggregates, overview totals, top games, recent sessions, and launch-method summaries.

