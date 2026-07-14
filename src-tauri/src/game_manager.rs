use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::Emitter;

use crate::db::Db;
use crate::paths::AppPaths;

// Field names match the renderer's `gameData` / `GameListItem` interfaces.
// Display fields (lastPlayedDisplay, *ImageDisplay) are computed on the
// renderer side now, so they are not part of the backend payload.

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct Game {
    pub uuid: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub cover_image: String,
    #[serde(default)]
    pub background_image: String,
    #[serde(default)]
    pub icon_image: String,
    #[serde(default)]
    pub last_played: Option<i64>,
    #[serde(default)]
    pub time_played: i64,
    #[serde(default)]
    pub working_dir: String,
    #[serde(default)]
    pub folder_size: i64,
    #[serde(default)]
    pub genre: Vec<String>,
    #[serde(default)]
    pub developer: Vec<String>,
    #[serde(default)]
    pub publisher: Vec<String>,
    #[serde(default)]
    pub release_date: Option<i64>,
    #[serde(default)]
    pub community_score: f64,
    #[serde(default)]
    pub personal_score: f64,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub links: Value,
    #[serde(default)]
    pub description: Value,
    #[serde(default)]
    pub actions: Value,
    #[serde(default)]
    pub proc_mon_mode: i64,
    #[serde(default)]
    pub proc_names: Vec<String>,
    #[serde(default)]
    pub date_added: i64,
    /// 0 = off, 1 = Locale Emulator, 2 = basic env-var mode
    #[serde(default)]
    pub locale_emulation: i64,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct GameListItem {
    pub uuid: String,
    pub title: String,
    pub icon_image: String,
    pub last_played: Option<i64>,
    pub date_added: i64,
    pub personal_score: f64,
    pub genre: Vec<String>,
    pub developer: Vec<String>,
    pub publisher: Vec<String>,
    pub tags: Vec<String>,
}

type CmdResult<T> = Result<T, String>;

fn e<E: std::fmt::Display>(ctx: &str) -> impl FnOnce(E) -> String + '_ {
    move |err| format!("{ctx}: {err}")
}

fn now_ms() -> i64 {
    chrono::Local::now().timestamp_millis()
}

// ---- junction helpers ----

fn get_or_create_id(conn: &Connection, table: &str, name: &str) -> CmdResult<i64> {
    if let Ok(id) = conn.query_row(
        &format!("SELECT id FROM {table} WHERE name = ?1"),
        params![name],
        |r| r.get::<_, i64>(0),
    ) {
        return Ok(id);
    }
    conn.execute(
        &format!("INSERT INTO {table} (name) VALUES (?1)"),
        params![name],
    )
    .map_err(e("insert lookup"))?;
    Ok(conn.last_insert_rowid())
}

fn sync_junction(
    conn: &Connection,
    game_uuid: &str,
    junction: &str,
    lookup: &str,
    id_col: &str,
    values: &[String],
) -> CmdResult<()> {
    conn.execute(
        &format!("DELETE FROM {junction} WHERE game_uuid = ?1"),
        params![game_uuid],
    )
    .map_err(e("clear junction"))?;

    for value in values {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            continue;
        }
        let id = get_or_create_id(conn, lookup, trimmed)?;
        conn.execute(
            &format!("INSERT OR IGNORE INTO {junction} (game_uuid, {id_col}) VALUES (?1, ?2)"),
            params![game_uuid, id],
        )
        .map_err(e("insert junction"))?;
    }
    Ok(())
}

fn junction_names(
    conn: &Connection,
    game_uuid: &str,
    junction: &str,
    lookup: &str,
    id_col: &str,
) -> Vec<String> {
    let sql = format!(
        "SELECT m.name FROM {lookup} m
         INNER JOIN {junction} j ON m.id = j.{id_col}
         WHERE j.game_uuid = ?1 ORDER BY m.name"
    );
    let Ok(mut stmt) = conn.prepare(&sql) else {
        return Vec::new();
    };
    let rows = stmt.query_map(params![game_uuid], |r| r.get::<_, String>(0));
    match rows {
        Ok(iter) => iter.filter_map(Result::ok).collect(),
        Err(_) => Vec::new(),
    }
}

fn parse_json_array(raw: Option<String>) -> Vec<String> {
    raw.and_then(|s| serde_json::from_str::<Vec<String>>(&s).ok())
        .unwrap_or_default()
}

fn parse_json_value(raw: Option<String>, fallback: Value) -> Value {
    raw.and_then(|s| serde_json::from_str::<Value>(&s).ok())
        .unwrap_or(fallback)
}

fn normalize_proc_mon_mode(mode: i64) -> i64 {
    if (0..=2).contains(&mode) {
        mode
    } else {
        1 // FOLDER default
    }
}

// ---- commands ----

#[tauri::command]
pub fn get_game_by_id(db: tauri::State<Db>, uuid: String) -> CmdResult<Option<Game>> {
    let conn = db.meta.lock().unwrap();

    let game = conn.query_row(
        "SELECT uuid, title, coverImage, backgroundImage, iconImage, lastPlayed,
                timePlayed, workingDir, folderSize, releaseDate, communityScore,
                personalScore, links, description, actions, procMonMode, procNames, dateAdded,
                localeEmulation
         FROM games WHERE uuid = ?1",
        params![uuid],
        |row| {
            Ok(Game {
                uuid: row.get(0)?,
                title: row.get::<_, Option<String>>(1)?.unwrap_or_default(),
                cover_image: row.get::<_, Option<String>>(2)?.unwrap_or_default(),
                background_image: row.get::<_, Option<String>>(3)?.unwrap_or_default(),
                icon_image: row.get::<_, Option<String>>(4)?.unwrap_or_default(),
                last_played: row.get(5)?,
                time_played: row.get::<_, Option<i64>>(6)?.unwrap_or(0),
                working_dir: row.get::<_, Option<String>>(7)?.unwrap_or_default(),
                folder_size: row.get::<_, Option<i64>>(8)?.unwrap_or(0),
                release_date: row.get(9)?,
                community_score: row.get::<_, Option<f64>>(10)?.unwrap_or(0.0),
                personal_score: row.get::<_, Option<f64>>(11)?.unwrap_or(0.0),
                links: parse_json_value(row.get(12)?, Value::Object(Default::default())),
                description: parse_json_value(row.get(13)?, Value::Array(vec![])),
                actions: parse_json_value(row.get(14)?, Value::Array(vec![])),
                proc_mon_mode: row.get::<_, Option<i64>>(15)?.unwrap_or(1),
                proc_names: parse_json_array(row.get(16)?),
                date_added: row.get::<_, Option<i64>>(17)?.unwrap_or(0),
                locale_emulation: row.get::<_, Option<i64>>(18)?.unwrap_or(0),
                genre: vec![],
                developer: vec![],
                publisher: vec![],
                tags: vec![],
            })
        },
    );

    match game {
        Ok(mut g) => {
            g.genre = junction_names(&conn, &uuid, "game_genres", "genres", "genre_id");
            g.developer =
                junction_names(&conn, &uuid, "game_developers", "developers", "developer_id");
            g.publisher =
                junction_names(&conn, &uuid, "game_publishers", "publishers", "publisher_id");
            g.tags = junction_names(&conn, &uuid, "game_tags", "tags", "tag_id");
            Ok(Some(g))
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(err) => Err(format!("get_game_by_id: {err}")),
    }
}

#[tauri::command]
pub fn get_games_list(db: tauri::State<Db>) -> CmdResult<Vec<GameListItem>> {
    let conn = db.meta.lock().unwrap();
    let mut stmt = conn
        .prepare(
            "SELECT g.uuid, g.title, g.iconImage, g.lastPlayed, g.dateAdded, g.personalScore,
                COALESCE(json_group_array(DISTINCT genres.name) FILTER (WHERE genres.name IS NOT NULL), '[]') as genre,
                COALESCE(json_group_array(DISTINCT developers.name) FILTER (WHERE developers.name IS NOT NULL), '[]') as developer,
                COALESCE(json_group_array(DISTINCT publishers.name) FILTER (WHERE publishers.name IS NOT NULL), '[]') as publisher,
                COALESCE(json_group_array(DISTINCT tags.name) FILTER (WHERE tags.name IS NOT NULL), '[]') as tags
             FROM games g
             LEFT JOIN game_genres gg ON g.uuid = gg.game_uuid
             LEFT JOIN genres ON gg.genre_id = genres.id
             LEFT JOIN game_developers gd ON g.uuid = gd.game_uuid
             LEFT JOIN developers ON gd.developer_id = developers.id
             LEFT JOIN game_publishers gp ON g.uuid = gp.game_uuid
             LEFT JOIN publishers ON gp.publisher_id = publishers.id
             LEFT JOIN game_tags gt ON g.uuid = gt.game_uuid
             LEFT JOIN tags ON gt.tag_id = tags.id
             GROUP BY g.uuid
             ORDER BY g.rowid",
        )
        .map_err(e("prepare games list"))?;

    let rows = stmt
        .query_map([], |row| {
            let genre: String = row.get(6)?;
            let developer: String = row.get(7)?;
            let publisher: String = row.get(8)?;
            let tags: String = row.get(9)?;
            Ok(GameListItem {
                uuid: row.get(0)?,
                title: row.get::<_, Option<String>>(1)?.unwrap_or_default(),
                icon_image: row.get::<_, Option<String>>(2)?.unwrap_or_default(),
                last_played: row.get(3)?,
                date_added: row.get::<_, Option<i64>>(4)?.unwrap_or(0),
                personal_score: row.get::<_, Option<f64>>(5)?.unwrap_or(0.0),
                genre: serde_json::from_str(&genre).unwrap_or_default(),
                developer: serde_json::from_str(&developer).unwrap_or_default(),
                publisher: serde_json::from_str(&publisher).unwrap_or_default(),
                tags: serde_json::from_str(&tags).unwrap_or_default(),
            })
        })
        .map_err(e("query games list"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(e("collect games list"))
}

fn write_game_row(conn: &Connection, game: &Game, is_insert: bool) -> CmdResult<()> {
    let mode = normalize_proc_mon_mode(game.proc_mon_mode);
    let links = serde_json::to_string(&game.links).unwrap_or_else(|_| "{}".into());
    let description = serde_json::to_string(&game.description).unwrap_or_else(|_| "[]".into());
    let actions = serde_json::to_string(&game.actions).unwrap_or_else(|_| "[]".into());
    let proc_names = serde_json::to_string(&game.proc_names).unwrap_or_else(|_| "[]".into());

    if is_insert {
        conn.execute(
            "INSERT INTO games (uuid, title, coverImage, backgroundImage, iconImage, lastPlayed,
                timePlayed, workingDir, folderSize, releaseDate, communityScore, personalScore,
                links, description, actions, procMonMode, procNames, dateAdded, localeEmulation)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19)",
            params![
                game.uuid, game.title, game.cover_image, game.background_image, game.icon_image,
                game.last_played, game.time_played, game.working_dir, game.folder_size,
                game.release_date, game.community_score, game.personal_score,
                links, description, actions, mode, proc_names, game.date_added,
                game.locale_emulation
            ],
        )
        .map_err(e("insert game"))?;
    } else {
        conn.execute(
            "UPDATE games SET title=?2, coverImage=?3, backgroundImage=?4, iconImage=?5,
                lastPlayed=?6, timePlayed=?7, workingDir=?8, folderSize=?9, releaseDate=?10,
                communityScore=?11, personalScore=?12, links=?13, description=?14, actions=?15,
                procMonMode=?16, procNames=?17, localeEmulation=?18 WHERE uuid=?1",
            params![
                game.uuid, game.title, game.cover_image, game.background_image, game.icon_image,
                game.last_played, game.time_played, game.working_dir, game.folder_size,
                game.release_date, game.community_score, game.personal_score,
                links, description, actions, mode, proc_names, game.locale_emulation
            ],
        )
        .map_err(e("update game"))?;
    }

    sync_junction(conn, &game.uuid, "game_genres", "genres", "genre_id", &game.genre)?;
    sync_junction(conn, &game.uuid, "game_developers", "developers", "developer_id", &game.developer)?;
    sync_junction(conn, &game.uuid, "game_publishers", "publishers", "publisher_id", &game.publisher)?;
    sync_junction(conn, &game.uuid, "game_tags", "tags", "tag_id", &game.tags)?;
    Ok(())
}

#[tauri::command]
pub fn add_game(
    app: tauri::AppHandle,
    db: tauri::State<Db>,
    paths: tauri::State<AppPaths>,
    mut game: Game,
) -> CmdResult<()> {
    // Move temp images into the library and rewrite paths to relative
    let moved = crate::file_manager::finalize_images(&paths, &game.uuid)?;
    crate::file_manager::apply_moved_image_paths(&mut game, &moved, &paths.app_data_path);

    if game.date_added == 0 {
        game.date_added = now_ms();
    }

    {
        let conn = db.meta.lock().unwrap();
        let tx = conn.unchecked_transaction().map_err(e("begin tx"))?;
        write_game_row(&tx, &game, true)?;
        tx.commit().map_err(e("commit"))?;
    }

    let _ = app.emit("game-store-changed", serde_json::json!({ "action": "add", "game": game }));
    Ok(())
}

#[tauri::command]
pub fn update_game(
    app: tauri::AppHandle,
    db: tauri::State<Db>,
    paths: tauri::State<AppPaths>,
    mut game: Game,
) -> CmdResult<()> {
    let moved = crate::file_manager::finalize_images(&paths, &game.uuid)?;
    crate::file_manager::apply_moved_image_paths(&mut game, &moved, &paths.app_data_path);

    {
        let conn = db.meta.lock().unwrap();
        let tx = conn.unchecked_transaction().map_err(e("begin tx"))?;
        write_game_row(&tx, &game, false)?;
        tx.commit().map_err(e("commit"))?;
    }

    let _ = app.emit("game-store-changed", serde_json::json!({ "action": "update", "game": game }));
    Ok(())
}

#[tauri::command]
pub fn delete_game(
    app: tauri::AppHandle,
    db: tauri::State<Db>,
    paths: tauri::State<AppPaths>,
    uuid: String,
) -> CmdResult<()> {
    let title: String = {
        let conn = db.meta.lock().unwrap();
        let title = conn
            .query_row(
                "SELECT title FROM games WHERE uuid = ?1",
                params![uuid],
                |r| r.get::<_, Option<String>>(0),
            )
            .map_err(|_| format!("Game with UUID {uuid} not found"))?
            .unwrap_or_default();

        // ON DELETE CASCADE removes junction rows
        conn.execute("DELETE FROM games WHERE uuid = ?1", params![uuid])
            .map_err(e("delete game"))?;

        // Orphan cleanup for lookup tables
        for (lookup, junction, id_col) in [
            ("genres", "game_genres", "genre_id"),
            ("developers", "game_developers", "developer_id"),
            ("publishers", "game_publishers", "publisher_id"),
            ("tags", "game_tags", "tag_id"),
        ] {
            let _ = conn.execute(
                &format!(
                    "DELETE FROM {lookup} WHERE id NOT IN (SELECT DISTINCT {id_col} FROM {junction})"
                ),
                [],
            );
        }
        title
    };

    // Remove image directories (library + any leftover temp)
    let lib_dir = paths.img_path_game.join(&uuid);
    let _ = std::fs::remove_dir_all(&lib_dir);
    let temp_dir = paths.temp_path.join("images").join(&uuid);
    let _ = std::fs::remove_dir_all(&temp_dir);

    // Fixed: emit game-store-changed (Electron emitted a dead game-list-changed)
    let _ = app.emit(
        "game-store-changed",
        serde_json::json!({ "action": "delete", "game": { "uuid": uuid, "title": title } }),
    );
    Ok(())
}

fn all_names(db: &tauri::State<Db>, table: &str) -> CmdResult<Vec<String>> {
    let conn = db.meta.lock().unwrap();
    let mut stmt = conn
        .prepare(&format!("SELECT name FROM {table} ORDER BY name"))
        .map_err(e("prepare names"))?;
    let rows = stmt
        .query_map([], |r| r.get::<_, String>(0))
        .map_err(e("query names"))?;
    rows.collect::<Result<Vec<_>, _>>().map_err(e("collect names"))
}

#[tauri::command]
pub fn get_all_genres(db: tauri::State<Db>) -> CmdResult<Vec<String>> {
    all_names(&db, "genres")
}

#[tauri::command]
pub fn get_all_developers(db: tauri::State<Db>) -> CmdResult<Vec<String>> {
    all_names(&db, "developers")
}

#[tauri::command]
pub fn get_all_publishers(db: tauri::State<Db>) -> CmdResult<Vec<String>> {
    all_names(&db, "publishers")
}

#[tauri::command]
pub fn get_all_tags(db: tauri::State<Db>) -> CmdResult<Vec<String>> {
    all_names(&db, "tags")
}
