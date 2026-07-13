use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::process::Child;
use std::time::{Duration, Instant};

use rusqlite::params;
use sysinfo::{ProcessesToUpdate, System};
use tauri::{Emitter, Manager};

use crate::db::Db;

// Rust rewrite of the Electron PowerShell-polling monitor. Same heuristics:
// - spawned process alive >= 10s  -> valid session on exit
// - exits sooner                  -> treated as a launcher; wait 5s, discover
//   the real game processes by mode, then poll every 3s until all are gone
// - watchdog closes the session row after 12h (the Electron version leaked
//   an open row here)
// sysinfo replaces the temp-.ps1 + full process enumeration per tick.

const VALID_SESSION_SECS: i64 = 10;
const LAUNCHER_DISCOVERY_DELAY: Duration = Duration::from_secs(5);
const POLL_INTERVAL: Duration = Duration::from_secs(3);
const MONITOR_TIMEOUT: Duration = Duration::from_secs(12 * 60 * 60);

pub struct MonitorInfo {
    pub game_uuid: String,
    pub executable_path: String,
    pub working_dir: PathBuf,
    pub proc_mon_mode: i64,
    pub proc_names: Vec<String>,
    pub session_id: i64,
    pub start_ms: i64,
}

fn now_ms() -> i64 {
    chrono::Local::now().timestamp_millis()
}

/// Entry point, runs on a dedicated thread per launched game.
pub fn monitor_game(app: tauri::AppHandle, mut child: Child, info: MonitorInfo) {
    // Phase 1: wait for the spawned process itself
    let exit_code = loop {
        match child.try_wait() {
            Ok(Some(status)) => break status.code().unwrap_or(0),
            Ok(None) => std::thread::sleep(Duration::from_millis(500)),
            Err(err) => {
                eprintln!("monitor: try_wait failed: {err}");
                break 0;
            }
        }
    };

    let elapsed_secs = (now_ms() - info.start_ms) / 1000;
    if elapsed_secs >= VALID_SESSION_SECS {
        println!(
            "Process ran {elapsed_secs}s -> valid game session (mode {})",
            info.proc_mon_mode
        );
        finalize(&app, &info, elapsed_secs, exit_code as i64, true);
        return;
    }

    // Phase 2: assumed launcher — give the real game processes time to start
    println!("Process ended after {elapsed_secs}s, likely a launcher. Discovering game processes...");
    std::thread::sleep(LAUNCHER_DISCOVERY_DELAY);

    let mut system = System::new();
    system.refresh_processes(ProcessesToUpdate::All, true);

    let mut watched: HashSet<sysinfo::Pid> = match info.proc_mon_mode {
        // FILE mode: only the spawned exe counts, and it already exited
        0 => {
            println!("FILE mode: original process already ended");
            finalize(&app, &info, 0, 0, false);
            return;
        }
        // FOLDER mode: every .exe whose path is inside the working dir
        1 => find_processes_in_folder(&system, &info.working_dir),
        // PROCESS mode: match by configured process names
        2 => find_processes_by_names(&system, &info.proc_names),
        _ => {
            eprintln!("Unknown procMonMode {}", info.proc_mon_mode);
            finalize(&app, &info, 0, 0, false);
            return;
        }
    };

    if watched.is_empty() {
        println!("No game processes found, ending session as launcher-only");
        finalize(&app, &info, 0, 0, false);
        return;
    }
    println!("Monitoring {} game process(es)", watched.len());

    // Phase 3: poll until all watched processes are gone
    let deadline = Instant::now() + MONITOR_TIMEOUT;
    loop {
        std::thread::sleep(POLL_INTERVAL);

        if Instant::now() >= deadline {
            // Fix over Electron: close the session row instead of leaking it
            println!("Game monitoring timeout reached (12 hours), closing session");
            finalize(&app, &info, 0, 0, false);
            return;
        }

        system.refresh_processes(ProcessesToUpdate::All, true);
        watched.retain(|pid| system.process(*pid).is_some());

        if watched.is_empty() {
            let total_secs = (now_ms() - info.start_ms) / 1000;
            println!("All game processes ended. Total session time: {total_secs}s");
            finalize(&app, &info, total_secs, 0, true);
            return;
        }
    }
}

/// FOLDER mode discovery. Uses Path::starts_with (component-wise), which
/// fixes the Electron prefix-collision bug (C:\Games\Foo matching
/// C:\Games\Foo2).
fn find_processes_in_folder(system: &System, folder: &Path) -> HashSet<sysinfo::Pid> {
    let mut found = HashSet::new();
    for (pid, process) in system.processes() {
        let Some(exe) = process.exe() else { continue };
        if !exe
            .extension()
            .is_some_and(|ext| ext.eq_ignore_ascii_case("exe"))
        {
            continue;
        }
        if exe.starts_with(folder) {
            println!("✓ Monitoring: {} (PID {pid})", exe.display());
            found.insert(*pid);
        }
    }
    found
}

/// PROCESS mode discovery: name match, with or without .exe suffix.
fn find_processes_by_names(system: &System, names: &[String]) -> HashSet<sysinfo::Pid> {
    let normalized: Vec<String> = names
        .iter()
        .map(|n| n.trim().trim_end_matches(".exe").to_lowercase())
        .filter(|n| !n.is_empty())
        .collect();
    if normalized.is_empty() {
        return HashSet::new();
    }

    let mut found = HashSet::new();
    for (pid, process) in system.processes() {
        let proc_name = process
            .name()
            .to_string_lossy()
            .trim_end_matches(".exe")
            .to_lowercase();
        if normalized.contains(&proc_name) {
            println!("✓ Monitoring: {proc_name} (PID {pid})");
            found.insert(*pid);
        }
    }
    found
}

/// Close the session row; for sessions >= 10s also credit games.timePlayed /
/// lastPlayed and emit game-session-ended. Always emits game-stopped.
fn finalize(
    app: &tauri::AppHandle,
    info: &MonitorInfo,
    session_secs: i64,
    exit_code: i64,
    completed_candidate: bool,
) {
    let db = app.state::<Db>();
    let end_ms = now_ms();
    let is_valid = completed_candidate && session_secs >= VALID_SESSION_SECS;

    {
        let conn = db.stats.lock().unwrap();
        let result = conn.execute(
            "UPDATE game SET endTime = ?1, durationSeconds = ?2, exitCode = ?3, isCompleted = ?4
             WHERE id = ?5",
            params![end_ms, session_secs, exit_code, is_valid as i64, info.session_id],
        );
        if let Err(err) = result {
            eprintln!("finalize: update session failed: {err}");
        }
    }

    if is_valid {
        let new_time_played: Option<i64> = {
            let conn = db.meta.lock().unwrap();
            let current: i64 = conn
                .query_row(
                    "SELECT timePlayed FROM games WHERE uuid = ?1",
                    params![info.game_uuid],
                    |r| r.get::<_, Option<i64>>(0),
                )
                .ok()
                .flatten()
                .unwrap_or(0);
            let new_total = current + session_secs;
            let updated = conn.execute(
                "UPDATE games SET timePlayed = ?1, lastPlayed = ?2 WHERE uuid = ?3",
                params![new_total, end_ms, info.game_uuid],
            );
            match updated {
                Ok(_) => Some(new_total),
                Err(err) => {
                    eprintln!("finalize: update timePlayed failed: {err}");
                    None
                }
            }
        };

        if let Some(total) = new_time_played {
            println!(
                "Session {} finalized: +{session_secs}s, total {total}s",
                info.session_id
            );
            let _ = app.emit(
                "game-session-ended",
                serde_json::json!({
                    "gameUuid": info.game_uuid,
                    "sessionId": info.session_id,
                    "sessionTimeSeconds": session_secs,
                    "totalTimePlayed": total,
                    "executablePath": info.executable_path,
                    "startTime": info.start_ms,
                    "endTime": end_ms,
                }),
            );
        }
    } else {
        println!(
            "Session {} closed as launcher/short ({session_secs}s), not counting play time",
            info.session_id
        );
    }

    let _ = app.emit(
        "game-stopped",
        serde_json::json!({ "gameUuid": info.game_uuid }),
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The Foo vs Foo2 prefix-collision fix: component-wise comparison.
    #[test]
    fn folder_match_is_component_wise() {
        let folder = Path::new("C:\\Games\\Foo");
        assert!(Path::new("C:\\Games\\Foo\\game.exe").starts_with(folder));
        assert!(Path::new("C:\\Games\\Foo\\sub\\engine.exe").starts_with(folder));
        assert!(!Path::new("C:\\Games\\Foo2\\game.exe").starts_with(folder));
    }
}
