// Canonical fresh-install schema (clean, without the deprecated columns that
// the Electron fresh-install DDL still carried). Migrated DBs are converged to
// these shapes by the v4 (metadata) / v3 (statistics) migrations.

pub const METADATA_GAMES: &str = "
CREATE TABLE IF NOT EXISTS games (
  uuid TEXT PRIMARY KEY,
  title TEXT,
  coverImage TEXT,
  backgroundImage TEXT,
  iconImage TEXT,
  lastPlayed NUMERIC,
  timePlayed NUMERIC DEFAULT 0,
  workingDir TEXT,
  folderSize NUMERIC DEFAULT 0,
  releaseDate NUMERIC,
  communityScore NUMERIC DEFAULT 0,
  personalScore NUMERIC DEFAULT 0,
  links TEXT,
  description TEXT,
  actions TEXT,
  procMonMode NUMERIC DEFAULT 1,
  procNames TEXT,
  dateAdded NUMERIC
)";

pub const METADATA_LOOKUP_TABLES: &[&str] = &[
    "CREATE TABLE IF NOT EXISTS genres (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL)",
    "CREATE TABLE IF NOT EXISTS developers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL)",
    "CREATE TABLE IF NOT EXISTS publishers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL)",
    "CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL)",
];

pub const METADATA_JUNCTION_TABLES: &[&str] = &[
    "CREATE TABLE IF NOT EXISTS game_genres (
        game_uuid TEXT NOT NULL,
        genre_id INTEGER NOT NULL,
        FOREIGN KEY (game_uuid) REFERENCES games(uuid) ON DELETE CASCADE,
        FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE,
        PRIMARY KEY (game_uuid, genre_id))",
    "CREATE TABLE IF NOT EXISTS game_developers (
        game_uuid TEXT NOT NULL,
        developer_id INTEGER NOT NULL,
        FOREIGN KEY (game_uuid) REFERENCES games(uuid) ON DELETE CASCADE,
        FOREIGN KEY (developer_id) REFERENCES developers(id) ON DELETE CASCADE,
        PRIMARY KEY (game_uuid, developer_id))",
    "CREATE TABLE IF NOT EXISTS game_publishers (
        game_uuid TEXT NOT NULL,
        publisher_id INTEGER NOT NULL,
        FOREIGN KEY (game_uuid) REFERENCES games(uuid) ON DELETE CASCADE,
        FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE,
        PRIMARY KEY (game_uuid, publisher_id))",
    "CREATE TABLE IF NOT EXISTS game_tags (
        game_uuid TEXT NOT NULL,
        tag_id INTEGER NOT NULL,
        FOREIGN KEY (game_uuid) REFERENCES games(uuid) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (game_uuid, tag_id))",
];

pub const METADATA_INDEXES: &[&str] = &[
    "CREATE INDEX IF NOT EXISTS idx_game_genres_game ON game_genres(game_uuid)",
    "CREATE INDEX IF NOT EXISTS idx_game_genres_genre ON game_genres(genre_id)",
    "CREATE INDEX IF NOT EXISTS idx_game_developers_game ON game_developers(game_uuid)",
    "CREATE INDEX IF NOT EXISTS idx_game_developers_dev ON game_developers(developer_id)",
    "CREATE INDEX IF NOT EXISTS idx_game_publishers_game ON game_publishers(game_uuid)",
    "CREATE INDEX IF NOT EXISTS idx_game_publishers_pub ON game_publishers(publisher_id)",
    "CREATE INDEX IF NOT EXISTS idx_game_tags_game ON game_tags(game_uuid)",
    "CREATE INDEX IF NOT EXISTS idx_game_tags_tag ON game_tags(tag_id)",
];

pub const STATISTICS_GAME: &str = "
CREATE TABLE IF NOT EXISTS game (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL,
  startTime NUMERIC NOT NULL,
  endTime NUMERIC,
  durationSeconds INTEGER,
  launchMethod TEXT,
  exitCode INTEGER,
  sessionDate TEXT NOT NULL,
  sessionYear INTEGER NOT NULL,
  sessionMonth INTEGER NOT NULL,
  sessionWeek INTEGER NOT NULL,
  sessionDayOfWeek INTEGER NOT NULL,
  isCompleted BOOLEAN DEFAULT 0,
  createdAt NUMERIC DEFAULT (strftime('%s', 'now') * 1000)
)";

pub const STATISTICS_INDEXES: &[&str] = &[
    "CREATE INDEX IF NOT EXISTS idx_game_uuid ON game (uuid)",
    "CREATE INDEX IF NOT EXISTS idx_game_date ON game (sessionDate)",
    "CREATE INDEX IF NOT EXISTS idx_game_year_month ON game (sessionYear, sessionMonth)",
    "CREATE INDEX IF NOT EXISTS idx_game_start_time ON game (startTime)",
    "CREATE INDEX IF NOT EXISTS idx_game_completed ON game (isCompleted)",
    "CREATE INDEX IF NOT EXISTS idx_game_launch_method ON game (launchMethod)",
];

pub const CREATE_VERSION_TABLE: &str =
    "CREATE TABLE IF NOT EXISTS db_version (version INTEGER PRIMARY KEY, applied_at TEXT DEFAULT (datetime('now')))";
