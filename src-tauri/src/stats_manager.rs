use chrono::{Datelike, Duration, Local, NaiveDate};
use rusqlite::params;
use serde::Serialize;

use crate::db::Db;

// Read-only statistics queries over statistics.db. Titles come from the
// ATTACHed metadata.db in a single JOIN (the Electron version looked up each
// title with a per-row query). sessionYear/sessionMonth comparisons are
// integer-typed; SQLite affinity also matches legacy zero-padded strings.

type CmdResult<T> = Result<T, String>;

fn e<E: std::fmt::Display>(ctx: &str) -> impl FnOnce(E) -> String + '_ {
    move |err| format!("{ctx}: {err}")
}

const TITLE_JOIN: &str = "LEFT JOIN meta.games mg ON g.uuid = mg.uuid";
const TITLE_COL: &str = "COALESCE(mg.title, 'Unknown Game') as title";

fn local_date_string(date: NaiveDate) -> String {
    date.format("%Y-%m-%d").to_string()
}

fn start_of_week() -> String {
    let today = Local::now().date_naive();
    let days_from_monday = today.weekday().num_days_from_monday() as i64;
    local_date_string(today - Duration::days(days_from_monday))
}

// ────────────────────────────
//   Row shapes
// ────────────────────────────

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyStat {
    session_date: String,
    total_seconds: i64,
    session_count: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyTotal {
    session_date: String,
    total_seconds: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WeeklyStat {
    session_date: String,
    session_day_of_week: i64,
    uuid: String,
    total_seconds: i64,
    session_count: i64,
    title: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DailySession {
    uuid: String,
    start_time: i64,
    end_time: Option<i64>,
    duration_seconds: i64,
    launch_method: Option<String>,
    title: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OverallStats {
    total_play_time: i64,
    total_sessions: i64,
    games_played: i64,
    today_play_time: i64,
    this_week_play_time: i64,
    this_month_play_time: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TopGameStat {
    uuid: String,
    total_seconds: i64,
    session_count: i64,
    last_played: String,
    title: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MonthlyStat {
    session_month: i64,
    total_seconds: i64,
    session_count: i64,
    unique_games: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentSession {
    id: i64,
    uuid: String,
    start_time: i64,
    end_time: Option<i64>,
    duration_seconds: i64,
    session_date: String,
    launch_method: Option<String>,
    title: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchMethodStat {
    launch_method: Option<String>,
    session_count: i64,
    total_seconds: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    avg_seconds: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    unique_games: Option<i64>,
    last_used: String,
}

// ────────────────────────────
//   Commands
// ────────────────────────────

fn daily_stats_query(db: &Db, sql: &str, params: &[&dyn rusqlite::ToSql]) -> CmdResult<Vec<DailyStat>> {
    let conn = db.stats.lock().unwrap();
    let mut stmt = conn.prepare(sql).map_err(e("prepare"))?;
    let rows = stmt
        .query_map(params, |r| {
            Ok(DailyStat {
                session_date: r.get(0)?,
                total_seconds: r.get::<_, Option<i64>>(1)?.unwrap_or(0),
                session_count: r.get(2)?,
            })
        })
        .map_err(e("query"))?;
    rows.collect::<Result<Vec<_>, _>>().map_err(e("collect"))
}

#[tauri::command]
pub fn get_game_recent_daily_stats(
    db: tauri::State<Db>,
    game_uuid: String,
    days: Option<i64>,
) -> CmdResult<Vec<DailyStat>> {
    let start = local_date_string(Local::now().date_naive() - Duration::days(days.unwrap_or(30)));
    daily_stats_query(
        &db,
        "SELECT sessionDate, SUM(durationSeconds), COUNT(*) FROM game
         WHERE uuid = ?1 AND isCompleted = 1 AND sessionDate >= ?2
         GROUP BY sessionDate ORDER BY sessionDate DESC",
        &[&game_uuid, &start],
    )
}

#[tauri::command]
pub fn get_game_daily_stats_range(
    db: tauri::State<Db>,
    game_uuid: String,
    start_date: String,
    end_date: String,
) -> CmdResult<Vec<DailyStat>> {
    daily_stats_query(
        &db,
        "SELECT sessionDate, SUM(durationSeconds), COUNT(*) FROM game
         WHERE uuid = ?1 AND isCompleted = 1 AND sessionDate >= ?2 AND sessionDate <= ?3
         GROUP BY sessionDate ORDER BY sessionDate DESC",
        &[&game_uuid, &start_date, &end_date],
    )
}

#[tauri::command]
pub fn get_weekly_stats_by_date(db: tauri::State<Db>, date_string: String) -> CmdResult<Vec<WeeklyStat>> {
    let date = NaiveDate::parse_from_str(&date_string, "%Y-%m-%d")
        .map_err(|_| format!("invalid date: {date_string}"))?;
    let iso = date.iso_week();

    let conn = db.stats.lock().unwrap();
    let sql = format!(
        "SELECT g.sessionDate, g.sessionDayOfWeek, g.uuid,
                SUM(g.durationSeconds), COUNT(*), {TITLE_COL}
         FROM game g {TITLE_JOIN}
         WHERE g.isCompleted = 1 AND g.sessionYear = ?1 AND g.sessionWeek = ?2
         GROUP BY g.sessionDate, g.sessionDayOfWeek, g.uuid
         ORDER BY g.sessionDayOfWeek ASC, g.uuid ASC"
    );
    let mut stmt = conn.prepare(&sql).map_err(e("prepare"))?;
    let rows = stmt
        .query_map(params![date.year(), iso.week()], |r| {
            Ok(WeeklyStat {
                session_date: r.get(0)?,
                session_day_of_week: r.get(1)?,
                uuid: r.get(2)?,
                total_seconds: r.get::<_, Option<i64>>(3)?.unwrap_or(0),
                session_count: r.get(4)?,
                title: r.get(5)?,
            })
        })
        .map_err(e("query"))?;
    rows.collect::<Result<Vec<_>, _>>().map_err(e("collect"))
}

#[tauri::command]
pub fn get_daily_game_sessions(db: tauri::State<Db>, date_string: String) -> CmdResult<Vec<DailySession>> {
    let conn = db.stats.lock().unwrap();
    let sql = format!(
        "SELECT g.uuid, g.startTime, g.endTime, g.durationSeconds, g.launchMethod, {TITLE_COL}
         FROM game g {TITLE_JOIN}
         WHERE g.isCompleted = 1 AND g.sessionDate = ?1
         ORDER BY g.startTime ASC"
    );
    let mut stmt = conn.prepare(&sql).map_err(e("prepare"))?;
    let rows = stmt
        .query_map(params![date_string], |r| {
            Ok(DailySession {
                uuid: r.get(0)?,
                start_time: r.get(1)?,
                end_time: r.get(2)?,
                duration_seconds: r.get::<_, Option<i64>>(3)?.unwrap_or(0),
                launch_method: r.get(4)?,
                title: r.get(5)?,
            })
        })
        .map_err(e("query"))?;
    rows.collect::<Result<Vec<_>, _>>().map_err(e("collect"))
}

#[tauri::command]
pub fn get_overall_stats(db: tauri::State<Db>) -> CmdResult<OverallStats> {
    let conn = db.stats.lock().unwrap();
    let one = |sql: &str, p: &[&dyn rusqlite::ToSql]| -> i64 {
        conn.query_row(sql, p, |r| r.get::<_, Option<i64>>(0))
            .ok()
            .flatten()
            .unwrap_or(0)
    };

    let now = Local::now();
    let today = local_date_string(now.date_naive());

    Ok(OverallStats {
        total_play_time: one("SELECT SUM(durationSeconds) FROM game WHERE isCompleted = 1", &[]),
        total_sessions: one("SELECT COUNT(*) FROM game WHERE isCompleted = 1", &[]),
        games_played: one("SELECT COUNT(DISTINCT uuid) FROM game WHERE isCompleted = 1", &[]),
        today_play_time: one(
            "SELECT SUM(durationSeconds) FROM game WHERE isCompleted = 1 AND sessionDate = ?1",
            &[&today],
        ),
        this_week_play_time: one(
            "SELECT SUM(durationSeconds) FROM game WHERE isCompleted = 1 AND sessionDate >= ?1",
            &[&start_of_week()],
        ),
        this_month_play_time: one(
            "SELECT SUM(durationSeconds) FROM game WHERE isCompleted = 1 AND sessionYear = ?1 AND sessionMonth = ?2",
            &[&(now.year() as i64), &(now.month() as i64)],
        ),
    })
}

#[tauri::command]
pub fn get_top_games_stats(db: tauri::State<Db>, limit: Option<i64>) -> CmdResult<Vec<TopGameStat>> {
    let conn = db.stats.lock().unwrap();
    let sql = format!(
        "SELECT g.uuid, SUM(g.durationSeconds), COUNT(*), MAX(g.sessionDate), {TITLE_COL}
         FROM game g {TITLE_JOIN}
         WHERE g.isCompleted = 1
         GROUP BY g.uuid ORDER BY SUM(g.durationSeconds) DESC LIMIT ?1"
    );
    let mut stmt = conn.prepare(&sql).map_err(e("prepare"))?;
    let rows = stmt
        .query_map(params![limit.unwrap_or(10)], |r| {
            Ok(TopGameStat {
                uuid: r.get(0)?,
                total_seconds: r.get::<_, Option<i64>>(1)?.unwrap_or(0),
                session_count: r.get(2)?,
                last_played: r.get(3)?,
                title: r.get(4)?,
            })
        })
        .map_err(e("query"))?;
    rows.collect::<Result<Vec<_>, _>>().map_err(e("collect"))
}

#[tauri::command]
pub fn get_monthly_stats(db: tauri::State<Db>, year: Option<i64>) -> CmdResult<Vec<MonthlyStat>> {
    let target = year.unwrap_or_else(|| Local::now().year() as i64);
    let conn = db.stats.lock().unwrap();
    let mut stmt = conn
        .prepare(
            "SELECT sessionMonth, SUM(durationSeconds), COUNT(*), COUNT(DISTINCT uuid)
             FROM game WHERE isCompleted = 1 AND sessionYear = ?1
             GROUP BY sessionMonth ORDER BY sessionMonth",
        )
        .map_err(e("prepare"))?;
    let rows = stmt
        .query_map(params![target], |r| {
            Ok(MonthlyStat {
                session_month: r.get(0)?,
                total_seconds: r.get::<_, Option<i64>>(1)?.unwrap_or(0),
                session_count: r.get(2)?,
                unique_games: r.get(3)?,
            })
        })
        .map_err(e("query"))?;
    rows.collect::<Result<Vec<_>, _>>().map_err(e("collect"))
}

fn daily_totals(db: &Db, sql: &str, params: &[&dyn rusqlite::ToSql]) -> CmdResult<Vec<DailyTotal>> {
    let conn = db.stats.lock().unwrap();
    let mut stmt = conn.prepare(sql).map_err(e("prepare"))?;
    let rows = stmt
        .query_map(params, |r| {
            Ok(DailyTotal {
                session_date: r.get(0)?,
                total_seconds: r.get::<_, Option<i64>>(1)?.unwrap_or(0),
            })
        })
        .map_err(e("query"))?;
    rows.collect::<Result<Vec<_>, _>>().map_err(e("collect"))
}

#[tauri::command]
pub fn get_monthly_daily_stats(db: tauri::State<Db>, year: i64, month: i64) -> CmdResult<Vec<DailyTotal>> {
    daily_totals(
        &db,
        "SELECT sessionDate, SUM(durationSeconds) FROM game
         WHERE isCompleted = 1 AND sessionYear = ?1 AND sessionMonth = ?2
         GROUP BY sessionDate ORDER BY sessionDate ASC",
        &[&year, &month],
    )
}

#[tauri::command]
pub fn get_yearly_daily_stats(db: tauri::State<Db>, year: Option<i64>) -> CmdResult<Vec<DailyTotal>> {
    let target = year.unwrap_or_else(|| Local::now().year() as i64);
    daily_totals(
        &db,
        "SELECT sessionDate, SUM(durationSeconds) FROM game
         WHERE isCompleted = 1 AND sessionYear = ?1
         GROUP BY sessionDate ORDER BY sessionDate ASC",
        &[&target],
    )
}

#[tauri::command]
pub fn get_recent_sessions(db: tauri::State<Db>, limit: Option<i64>) -> CmdResult<Vec<RecentSession>> {
    let conn = db.stats.lock().unwrap();
    let sql = format!(
        "SELECT g.id, g.uuid, g.startTime, g.endTime, g.durationSeconds,
                g.sessionDate, g.launchMethod, {TITLE_COL}
         FROM game g {TITLE_JOIN}
         WHERE g.isCompleted = 1 ORDER BY g.startTime DESC LIMIT ?1"
    );
    let mut stmt = conn.prepare(&sql).map_err(e("prepare"))?;
    let rows = stmt
        .query_map(params![limit.unwrap_or(20)], |r| {
            Ok(RecentSession {
                id: r.get(0)?,
                uuid: r.get(1)?,
                start_time: r.get(2)?,
                end_time: r.get(3)?,
                duration_seconds: r.get::<_, Option<i64>>(4)?.unwrap_or(0),
                session_date: r.get(5)?,
                launch_method: r.get(6)?,
                title: r.get(7)?,
            })
        })
        .map_err(e("query"))?;
    rows.collect::<Result<Vec<_>, _>>().map_err(e("collect"))
}

#[tauri::command]
pub fn get_launch_method_stats(
    db: tauri::State<Db>,
    game_uuid: Option<String>,
) -> CmdResult<Vec<LaunchMethodStat>> {
    let conn = db.stats.lock().unwrap();

    if let Some(uuid) = game_uuid {
        let mut stmt = conn
            .prepare(
                "SELECT launchMethod, COUNT(*), SUM(durationSeconds), AVG(durationSeconds), MAX(sessionDate)
                 FROM game WHERE isCompleted = 1 AND uuid = ?1
                 GROUP BY launchMethod ORDER BY COUNT(*) DESC",
            )
            .map_err(e("prepare"))?;
        let rows = stmt
            .query_map(params![uuid], |r| {
                Ok(LaunchMethodStat {
                    launch_method: r.get(0)?,
                    session_count: r.get(1)?,
                    total_seconds: r.get::<_, Option<i64>>(2)?.unwrap_or(0),
                    avg_seconds: r.get(3)?,
                    unique_games: None,
                    last_used: r.get(4)?,
                })
            })
            .map_err(e("query"))?;
        rows.collect::<Result<Vec<_>, _>>().map_err(e("collect"))
    } else {
        let mut stmt = conn
            .prepare(
                "SELECT launchMethod, COUNT(*), SUM(durationSeconds), COUNT(DISTINCT uuid), MAX(sessionDate)
                 FROM game WHERE isCompleted = 1
                 GROUP BY launchMethod ORDER BY COUNT(*) DESC",
            )
            .map_err(e("prepare"))?;
        let rows = stmt
            .query_map([], |r| {
                Ok(LaunchMethodStat {
                    launch_method: r.get(0)?,
                    session_count: r.get(1)?,
                    total_seconds: r.get::<_, Option<i64>>(2)?.unwrap_or(0),
                    avg_seconds: None,
                    unique_games: r.get(3)?,
                    last_used: r.get(4)?,
                })
            })
            .map_err(e("query"))?;
        rows.collect::<Result<Vec<_>, _>>().map_err(e("collect"))
    }
}
