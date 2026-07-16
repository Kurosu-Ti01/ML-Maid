---
title: Launching and Playtime
permalink: /user-guide/launching/
createTime: 2026/07/15 23:20:01
---

# Launching and Playtime

Create at least one File action and select an existing executable. If Working Directory is blank, ML-Maid uses the executable's directory. After launch, the button reads Playing and prevents a duplicate launch until monitoring ends.

## Monitoring modes

| Mode | Behavior | Best use |
| --- | --- | --- |
| File | Waits only for the directly launched process | The game executable remains alive |
| Folder | Watches executable processes inside the working directory | Recommended for most visual novels |
| Process | Matches configured process names | The real game process runs elsewhere |

A directly launched process that runs for at least 10 seconds becomes a valid session. If it exits earlier, ML-Maid treats it as a launcher, waits 5 seconds, discovers the real process according to the selected mode, and polls every 3 seconds. Missing targets do not add playtime. Monitoring stops after 12 hours. A valid session updates total playtime, last played, and statistics.

## Japanese locale modes

- Off: start the executable directly.
- Locale Emulator: run `LEProc.exe <game.exe>`, suitable for older Japanese engines.
- Basic: set `LANG` and `LC_ALL` to `ja_JP.UTF-8`; this only helps software that reads those variables.

Before using Locale Emulator, detect or browse to `LEProc.exe` under Settings → Launcher. An invalid path fails before a session is created.

