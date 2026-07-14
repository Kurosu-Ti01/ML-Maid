use std::fs;
use std::path::Path;

use chrono::Local;
use rusqlite::Connection;

use super::schema;

pub type DbResult<T> = Result<T, String>;

fn err<E: std::fmt::Display>(context: &str) -> impl FnOnce(E) -> String + '_ {
    move |e| format!("{context}: {e}")
}

fn ensure_version_table(conn: &Connection) -> DbResult<()> {
    conn.execute(schema::CREATE_VERSION_TABLE, [])
        .map_err(err("create db_version"))?;
    Ok(())
}

fn get_version(conn: &Connection) -> i64 {
    conn.query_row("SELECT MAX(version) FROM db_version", [], |row| {
        row.get::<_, Option<i64>>(0)
    })
    .ok()
    .flatten()
    .unwrap_or(0)
}

fn set_version(conn: &Connection, version: i64) -> DbResult<()> {
    conn.execute(
        "INSERT OR REPLACE INTO db_version (version) VALUES (?1)",
        [version],
    )
    .map_err(err("update db_version"))?;
    Ok(())
}

fn column_exists(conn: &Connection, table: &str, column: &str) -> DbResult<bool> {
    let mut stmt = conn
        .prepare(&format!("PRAGMA table_info({table})"))
        .map_err(err("pragma table_info"))?;
    let names = stmt
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(err("read table_info"))?;
    for name in names {
        if name.map_err(err("row"))? == column {
            return Ok(true);
        }
    }
    Ok(false)
}

/// Copy the DB file to `<name>.backup.v<version>.<timestamp>` before a
/// destructive migration, matching the Electron backup naming.
fn backup_db(db_path: &Path, from_version: i64) -> DbResult<()> {
    let ts = Local::now().timestamp_millis();
    let file_name = db_path
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or("invalid db path")?;
    let backup = db_path.with_file_name(format!("{file_name}.backup.v{from_version}.{ts}"));
    fs::copy(db_path, &backup).map_err(err("backup db"))?;
    println!("Backup created: {}", backup.display());
    Ok(())
}

// ==========================================
//  metadata.db
// ==========================================

pub fn migrate_metadata(conn: &Connection, db_path: &Path) -> DbResult<()> {
    // Fresh install: create clean schema
    conn.execute(schema::METADATA_GAMES, [])
        .map_err(err("create games"))?;
    for ddl in schema::METADATA_LOOKUP_TABLES {
        conn.execute(ddl, []).map_err(err("create lookup table"))?;
    }
    for ddl in schema::METADATA_JUNCTION_TABLES {
        conn.execute(ddl, []).map_err(err("create junction table"))?;
    }
    for ddl in schema::METADATA_INDEXES {
        conn.execute(ddl, []).map_err(err("create index"))?;
    }

    ensure_version_table(conn)?;
    let version = get_version(conn);
    println!("Current metadata database version: {version}");

    // The Electron app owns migrations v1..v3. Rust only converges divergent
    // v3 schemas (fresh-install DBs still carrying deprecated columns) via v4.
    if version > 0 && version < 3 {
        return Err(format!(
            "metadata.db is at version {version}; please open it once with an older \
             ML-Maid (Electron) build to upgrade to v3 before using this version"
        ));
    }

    if version < 4 {
        migrate_metadata_v4(conn, db_path, version)?;
        set_version(conn, 4)?;
    }

    if get_version(conn) < 5 {
        migrate_metadata_v5(conn)?;
        set_version(conn, 5)?;
    }

    println!("Metadata database initialization completed");
    Ok(())
}

/// v4: drop the deprecated genre/developer/publisher/tags columns that the old
/// fresh-install DDL left on brand-new DBs (migrated DBs already lack them).
fn migrate_metadata_v4(conn: &Connection, db_path: &Path, from_version: i64) -> DbResult<()> {
    let deprecated = ["genre", "developer", "publisher", "tags"];
    let present: Vec<&str> = deprecated
        .iter()
        .filter(|c| column_exists(conn, "games", c).unwrap_or(false))
        .copied()
        .collect();

    if present.is_empty() {
        return Ok(());
    }

    println!("Migrating metadata.db to v4: dropping deprecated columns {present:?}");
    // from_version is 0 for brand-new DBs; only back up real existing data
    if from_version >= 3 {
        backup_db(db_path, from_version)?;
    }

    conn.execute("PRAGMA foreign_keys = OFF", [])
        .map_err(err("disable fk"))?;
    for col in &present {
        conn.execute(&format!("ALTER TABLE games DROP COLUMN {col}"), [])
            .map_err(err("drop column"))?;
    }
    conn.execute("PRAGMA foreign_keys = ON", [])
        .map_err(err("enable fk"))?;
    Ok(())
}

// ==========================================
//  statistics.db
// ==========================================

pub fn migrate_statistics(conn: &Connection, db_path: &Path) -> DbResult<()> {
    conn.execute(schema::STATISTICS_GAME, [])
        .map_err(err("create game"))?;
    for ddl in schema::STATISTICS_INDEXES {
        conn.execute(ddl, []).map_err(err("create index"))?;
    }

    ensure_version_table(conn)?;
    let version = get_version(conn);
    println!("Current statistics database version: {version}");

    if version > 0 && version < 2 {
        return Err(format!(
            "statistics.db is at version {version}; please open it once with an older \
             ML-Maid (Electron) build to upgrade to v2 before using this version"
        ));
    }

    if version < 3 {
        migrate_statistics_v3(conn, db_path, version)?;
        set_version(conn, 3)?;
    }

    // Startup cleanup: sessions left open by a crash/quit carry no real
    // playtime; remove them so stats queries stay clean.
    let removed = conn
        .execute("DELETE FROM game WHERE endTime IS NULL", [])
        .map_err(err("cleanup orphan sessions"))?;
    if removed > 0 {
        println!("Cleaned up {removed} orphaned (never-finalized) sessions");
    }

    println!("Statistics database initialization completed");
    Ok(())
}

/// v3: drop deprecated title/executablePath columns left on fresh-install DBs.
fn migrate_statistics_v3(conn: &Connection, db_path: &Path, from_version: i64) -> DbResult<()> {
    let deprecated = ["title", "executablePath"];
    let present: Vec<&str> = deprecated
        .iter()
        .filter(|c| column_exists(conn, "game", c).unwrap_or(false))
        .copied()
        .collect();

    if present.is_empty() {
        return Ok(());
    }

    println!("Migrating statistics.db to v3: dropping deprecated columns {present:?}");
    if from_version >= 2 {
        backup_db(db_path, from_version)?;
    }

    for col in &present {
        conn.execute(&format!("ALTER TABLE game DROP COLUMN {col}"), [])
            .map_err(err("drop column"))?;
    }
    Ok(())
}

/// v5: per-game locale-emulation launch mode (0=off, 1=Locale Emulator,
/// 2=basic env-var mode) for the new Japanese-locale launch feature.
fn migrate_metadata_v5(conn: &Connection) -> DbResult<()> {
    if column_exists(conn, "games", "localeEmulation")? {
        return Ok(());
    }
    println!("Migrating metadata.db to v5: adding localeEmulation column");
    conn.execute(
        "ALTER TABLE games ADD COLUMN localeEmulation INTEGER NOT NULL DEFAULT 0",
        [],
    )
    .map_err(err("add localeEmulation"))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_db(name: &str) -> std::path::PathBuf {
        let path = std::env::temp_dir().join(format!("ml-maid-test-{name}-{}.db", std::process::id()));
        let _ = fs::remove_file(&path);
        path
    }

    /// Legacy fresh-install metadata DB (v3 in db_version but still carrying
    /// the deprecated genre/developer/publisher/tags columns) converges to v4.
    #[test]
    fn metadata_legacy_fresh_install_converges() {
        let path = temp_db("meta-legacy");
        let conn = Connection::open(&path).unwrap();
        conn.execute_batch(
            "CREATE TABLE games (
                uuid TEXT PRIMARY KEY, title TEXT, coverImage TEXT, backgroundImage TEXT,
                iconImage TEXT, lastPlayed NUMERIC, timePlayed NUMERIC DEFAULT 0,
                workingDir TEXT, folderSize NUMERIC DEFAULT 0,
                genre TEXT, developer TEXT, publisher TEXT,
                releaseDate NUMERIC, communityScore NUMERIC DEFAULT 0,
                personalScore NUMERIC DEFAULT 0, tags TEXT,
                links TEXT, description TEXT, actions TEXT,
                procMonMode NUMERIC DEFAULT 1, procNames TEXT, dateAdded NUMERIC);
             CREATE TABLE db_version (version INTEGER PRIMARY KEY, applied_at TEXT);
             INSERT INTO db_version (version) VALUES (3);
             INSERT INTO games (uuid, title, genre) VALUES ('u1', 'Test Game', 'ADV');",
        )
        .unwrap();

        migrate_metadata(&conn, &path).unwrap();

        assert_eq!(get_version(&conn), 5);
        for col in ["genre", "developer", "publisher", "tags"] {
            assert!(!column_exists(&conn, "games", col).unwrap(), "{col} should be dropped");
        }
        // v5 added the locale emulation column
        assert!(column_exists(&conn, "games", "localeEmulation").unwrap());
        // Data survives
        let title: String = conn
            .query_row("SELECT title FROM games WHERE uuid='u1'", [], |r| r.get(0))
            .unwrap();
        assert_eq!(title, "Test Game");
        drop(conn);
        let _ = fs::remove_file(&path);
    }

    /// Already-clean v3 metadata DB just gets the version bump, no backup needed.
    #[test]
    fn metadata_clean_v3_bumps_version() {
        let path = temp_db("meta-clean");
        let conn = Connection::open(&path).unwrap();
        conn.execute_batch(
            "CREATE TABLE db_version (version INTEGER PRIMARY KEY, applied_at TEXT);
             INSERT INTO db_version (version) VALUES (3);",
        )
        .unwrap();

        migrate_metadata(&conn, &path).unwrap();
        assert_eq!(get_version(&conn), 5);
        drop(conn);
        let _ = fs::remove_file(&path);
    }

    /// Pre-v3 DBs are rejected with a helpful message instead of mangled.
    #[test]
    fn metadata_pre_v3_rejected() {
        let path = temp_db("meta-old");
        let conn = Connection::open(&path).unwrap();
        conn.execute_batch(
            "CREATE TABLE db_version (version INTEGER PRIMARY KEY, applied_at TEXT);
             INSERT INTO db_version (version) VALUES (2);",
        )
        .unwrap();

        let result = migrate_metadata(&conn, &path);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("version 2"));
        drop(conn);
        let _ = fs::remove_file(&path);
    }

    /// Legacy fresh-install statistics DB drops title/executablePath and
    /// orphaned sessions are cleaned up on startup.
    #[test]
    fn statistics_legacy_and_orphan_cleanup() {
        let path = temp_db("stats-legacy");
        let conn = Connection::open(&path).unwrap();
        conn.execute_batch(
            "CREATE TABLE game (
                id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT NOT NULL, title TEXT,
                startTime NUMERIC NOT NULL, endTime NUMERIC, durationSeconds INTEGER,
                launchMethod TEXT, executablePath TEXT, exitCode INTEGER,
                sessionDate TEXT NOT NULL, sessionYear INTEGER NOT NULL,
                sessionMonth INTEGER NOT NULL, sessionWeek INTEGER NOT NULL,
                sessionDayOfWeek INTEGER NOT NULL, isCompleted BOOLEAN DEFAULT 0,
                createdAt NUMERIC);
             CREATE TABLE db_version (version INTEGER PRIMARY KEY, applied_at TEXT);
             INSERT INTO db_version (version) VALUES (2);
             INSERT INTO game (uuid, startTime, endTime, sessionDate, sessionYear, sessionMonth, sessionWeek, sessionDayOfWeek)
               VALUES ('u1', 1000, 2000, '2026-07-12', 2026, 7, 28, 6);
             INSERT INTO game (uuid, startTime, endTime, sessionDate, sessionYear, sessionMonth, sessionWeek, sessionDayOfWeek)
               VALUES ('u1', 3000, NULL, '2026-07-12', 2026, 7, 28, 6);",
        )
        .unwrap();

        migrate_statistics(&conn, &path).unwrap();

        assert_eq!(get_version(&conn), 3);
        assert!(!column_exists(&conn, "game", "title").unwrap());
        assert!(!column_exists(&conn, "game", "executablePath").unwrap());
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM game", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 1, "orphaned NULL-endTime session should be removed");
        drop(conn);
        let _ = fs::remove_file(&path);
    }

    /// Brand-new empty DB gets the clean schema at the latest version.
    #[test]
    fn fresh_install_gets_clean_schema() {
        let meta_path = temp_db("meta-fresh");
        let conn = Connection::open(&meta_path).unwrap();
        migrate_metadata(&conn, &meta_path).unwrap();
        assert_eq!(get_version(&conn), 5);
        for col in ["genre", "developer", "publisher", "tags"] {
            assert!(!column_exists(&conn, "games", col).unwrap());
        }
        assert!(column_exists(&conn, "games", "localeEmulation").unwrap());
        drop(conn);
        let _ = fs::remove_file(&meta_path);

        let stats_path = temp_db("stats-fresh");
        let conn = Connection::open(&stats_path).unwrap();
        migrate_statistics(&conn, &stats_path).unwrap();
        assert_eq!(get_version(&conn), 3);
        assert!(!column_exists(&conn, "game", "title").unwrap());
        drop(conn);
        let _ = fs::remove_file(&stats_path);
    }
}
