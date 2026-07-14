use std::path::{Path, PathBuf};

use chrono::{Datelike, Local};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::Emitter;

use crate::db::Db;
use crate::process_monitor::{self, MonitorInfo};

type CmdResult<T> = Result<T, String>;

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LaunchParams {
    pub game_uuid: String,
    pub executable_path: String,
    #[serde(default)]
    pub launch_method_name: String,
    #[serde(default)]
    pub working_dir: String,
    #[serde(default = "default_mode")]
    pub proc_mon_mode: i64,
    #[serde(default)]
    pub proc_names: Vec<String>,
    /// 0 = off, 1 = Locale Emulator, 2 = basic env-var mode
    #[serde(default)]
    pub locale_emulation: i64,
}

fn default_mode() -> i64 {
    1 // FOLDER
}

/// Look for LEProc.exe in common Locale Emulator install locations.
/// Returns the path if found, None otherwise (user can browse manually).
#[tauri::command]
pub fn detect_locale_emulator() -> Option<String> {
    let mut candidates: Vec<PathBuf> = Vec::new();

    for env_var in ["ProgramFiles", "ProgramFiles(x86)", "LOCALAPPDATA"] {
        if let Ok(base) = std::env::var(env_var) {
            candidates.push(PathBuf::from(&base).join("Locale Emulator").join("LEProc.exe"));
            candidates.push(
                PathBuf::from(&base)
                    .join("Programs")
                    .join("Locale Emulator")
                    .join("LEProc.exe"),
            );
        }
    }
    if let Ok(user) = std::env::var("USERPROFILE") {
        for dir in ["Locale Emulator", "Tools\\Locale Emulator", "Downloads\\Locale Emulator"] {
            candidates.push(PathBuf::from(&user).join(dir).join("LEProc.exe"));
        }
    }

    candidates
        .into_iter()
        .find(|p| p.exists())
        .map(|p| p.to_string_lossy().to_string())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchResult {
    pub success: bool,
    pub message: String,
    pub executable_path: String,
}

#[tauri::command]
pub fn launch_game(
    app: tauri::AppHandle,
    db: tauri::State<Db>,
    settings: tauri::State<crate::settings::SettingsState>,
    params: LaunchParams,
) -> CmdResult<LaunchResult> {
    let exe = PathBuf::from(&params.executable_path);
    if !exe.exists() {
        return Err(format!(
            "Game executable not found at: {}",
            params.executable_path
        ));
    }
    if params.launch_method_name.is_empty() {
        return Err("Launch method name is required".into());
    }

    let working_dir = if params.working_dir.is_empty() {
        exe.parent().map(Path::to_path_buf).unwrap_or_default()
    } else {
        PathBuf::from(&params.working_dir)
    };

    // Build the command according to the locale-emulation mode. Do this
    // BEFORE opening the session row so a missing LEProc fails cleanly.
    let mut command = match params.locale_emulation {
        // Locale Emulator: delegate to LEProc.exe <game.exe> (default profile).
        // LE hooks the NLS APIs at kernel level, which is the only approach
        // that works reliably for old VN engines.
        1 => {
            let le_path = settings.get().launcher.locale_emulator_path;
            if le_path.is_empty() {
                return Err("Locale Emulator path is not configured in Settings".into());
            }
            if !Path::new(&le_path).exists() {
                return Err(format!("LEProc.exe not found at: {le_path}"));
            }
            let mut cmd = std::process::Command::new(le_path);
            cmd.arg(&exe);
            cmd
        }
        // Basic mode: Japanese env vars only; helps some engines, labeled
        // "basic" in the UI because it cannot help ANSI-codepage ones
        2 => {
            let mut cmd = std::process::Command::new(&exe);
            cmd.env("LANG", "ja_JP.UTF-8").env("LC_ALL", "ja_JP.UTF-8");
            cmd
        }
        _ => std::process::Command::new(&exe),
    };
    command.current_dir(&working_dir);

    println!(
        "Launching game: {} (cwd: {}, mode: {}, locale: {})",
        params.executable_path,
        working_dir.display(),
        params.proc_mon_mode,
        params.locale_emulation
    );

    // Session date fields (local time; ISO week, Monday=0 like the frontend)
    let now = Local::now();
    let start_ms = now.timestamp_millis();
    let session_date = now.format("%Y-%m-%d").to_string();
    let session_year = now.year() as i64;
    let session_month = now.month() as i64;
    let session_week = now.iso_week().week() as i64;
    let session_day_of_week = now.weekday().num_days_from_monday() as i64;

    // Open session row (endTime NULL until finalized)
    let session_id: i64 = {
        let conn = db.stats.lock().unwrap();
        conn.execute(
            "INSERT INTO game (uuid, startTime, launchMethod, sessionDate,
                sessionYear, sessionMonth, sessionWeek, sessionDayOfWeek)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                params.game_uuid,
                start_ms,
                params.launch_method_name,
                session_date,
                session_year,
                session_month,
                session_week,
                session_day_of_week
            ],
        )
        .map_err(|e| format!("create session: {e}"))?;
        conn.last_insert_rowid()
    };
    println!("Created game session {session_id} for game {}", params.game_uuid);

    // Spawn the game process
    let child = command
        .spawn()
        .map_err(|e| format!("failed to launch: {e}"))?;

    let _ = app.emit(
        "game-launched",
        serde_json::json!({ "gameUuid": params.game_uuid }),
    );

    // Hand off to the monitor thread (owns exit heuristics + finalization)
    let info = MonitorInfo {
        game_uuid: params.game_uuid,
        executable_path: params.executable_path.clone(),
        working_dir,
        proc_mon_mode: params.proc_mon_mode,
        proc_names: params.proc_names,
        session_id,
        start_ms,
    };
    let app_handle = app.clone();
    std::thread::spawn(move || {
        process_monitor::monitor_game(app_handle, child, info);
    });

    Ok(LaunchResult {
        success: true,
        message: "Game launched successfully".into(),
        executable_path: params.executable_path,
    })
}
