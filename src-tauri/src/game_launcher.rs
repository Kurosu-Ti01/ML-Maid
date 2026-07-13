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
}

fn default_mode() -> i64 {
    1 // FOLDER
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

    println!(
        "Launching game: {} (cwd: {}, mode: {})",
        params.executable_path,
        working_dir.display(),
        params.proc_mon_mode
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
    let child = std::process::Command::new(&exe)
        .current_dir(&working_dir)
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
