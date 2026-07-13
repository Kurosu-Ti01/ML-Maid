pub mod migrations;
pub mod schema;

use std::path::Path;
use std::sync::Mutex;

use rusqlite::Connection;

/// Two SQLite connections, each guarded by a Mutex, stored in Tauri State.
/// Commands are short-lived so a single connection per DB is sufficient.
pub struct Db {
    pub meta: Mutex<Connection>,
    pub stats: Mutex<Connection>,
}

pub fn init(lib_path: &Path) -> Result<Db, String> {
    std::fs::create_dir_all(lib_path).map_err(|e| format!("create library dir: {e}"))?;

    let meta_path = lib_path.join("metadata.db");
    let stats_path = lib_path.join("statistics.db");

    let meta = Connection::open(&meta_path).map_err(|e| format!("open metadata.db: {e}"))?;
    meta.execute_batch("PRAGMA foreign_keys = ON")
        .map_err(|e| format!("enable fk: {e}"))?;
    migrations::migrate_metadata(&meta, &meta_path)?;

    let stats = Connection::open(&stats_path).map_err(|e| format!("open statistics.db: {e}"))?;
    migrations::migrate_statistics(&stats, &stats_path)?;

    // ATTACH metadata.db so stats queries can join game titles in one query
    // (the Electron version did an N+1 title lookup per row)
    let meta_path_sql = meta_path.to_string_lossy().replace('\'', "''");
    stats
        .execute_batch(&format!("ATTACH DATABASE '{meta_path_sql}' AS meta"))
        .map_err(|e| format!("attach metadata.db: {e}"))?;

    Ok(Db {
        meta: Mutex::new(meta),
        stats: Mutex::new(stats),
    })
}
