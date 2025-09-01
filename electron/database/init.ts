import { createRequire } from 'node:module'
import path from 'node:path'
import fs from 'node:fs'

const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')

export interface DatabaseConfig {
  appDataPath: string
  libPath: string
  tempPath: string
  imgPath_game: string
}

export function initializeDatabases(config: DatabaseConfig) {
  const { libPath, tempPath, imgPath_game } = config

  // Create directories if they don't exist
  if (!fs.existsSync(libPath)) {
    fs.mkdirSync(libPath, { recursive: true })
  }
  if (!fs.existsSync(tempPath)) {
    fs.mkdirSync(tempPath, { recursive: true })
  }
  if (!fs.existsSync(imgPath_game)) {
    fs.mkdirSync(imgPath_game, { recursive: true })
  }

  // Initialize databases
  const dbPath_metadata = path.join(libPath, 'metadata.db')
  const dbPath_statistics = path.join(libPath, 'statistics.db')

  const metaDb = new Database(dbPath_metadata)
  const statsDb = new Database(dbPath_statistics)

  // Initialize game database schema
  metaDb.prepare(`
    CREATE TABLE IF NOT EXISTS games (
      uuid TEXT PRIMARY KEY,
      title TEXT,
      coverImage TEXT,
      backgroundImage TEXT,
      iconImage TEXT,
      lastPlayed TEXT,   -- ISO 8601 format: YYYY-MM-DD HH:MM:SS (UTC)
      timePlayed  NUMERIC DEFAULT 0,
      workingDir TEXT,
      folderSize NUMERIC DEFAULT 0,
      genre TEXT,
      developer TEXT,
      publisher TEXT,
      releaseDate TEXT,
      communityScore NUMERIC DEFAULT 0,
      personalScore NUMERIC DEFAULT 0,
      tags TEXT,                          -- use JSON.stringify to store, use JSON.parse to retrieve
      links TEXT,                         -- use JSON.stringify to store, use JSON.parse to retrieve
      description TEXT,                   -- use JSON.stringify to store, use JSON.parse to retrieve
      actions TEXT,                       -- use JSON.stringify to store, use JSON.parse to retrieve
      procMonMode NUMERIC DEFAULT 1,      -- file:0 / folder:1 / process:2
      procNames TEXT                      -- use JSON.stringify to store process names array when procMonMode=2
    )
  `).run()

  // Initialize statistics database schema
  statsDb.prepare(`
    CREATE TABLE IF NOT EXISTS game (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT NOT NULL,
      title TEXT,                            -- Game title for easier querying
      startTime TEXT NOT NULL,               -- YYYY-MM-DD HH:MM:SS format (UTC)
      endTime TEXT,                          -- YYYY-MM-DD HH:MM:SS format (UTC), NULL if session is ongoing
      durationSeconds INTEGER,               -- Duration in seconds, calculated when session ends
      launchMethod TEXT,                     -- Launch method name (e.g., "Direct Launch", "Steam", "Launcher")
      executablePath TEXT,                   -- Path of the executable that was launched
      exitCode INTEGER,                      -- Process exit code, NULL if session is ongoing
      sessionDate TEXT NOT NULL,             -- YYYY-MM-DD format for easy date-based queries (local date)
      sessionYear INTEGER NOT NULL,          -- Year for yearly statistics (local time)
      sessionMonth INTEGER NOT NULL,         -- Month (1-12) for monthly statistics (local time)
      sessionWeek INTEGER NOT NULL,          -- Week number (1-53) for weekly statistics (local time)
      sessionDayOfWeek INTEGER NOT NULL,     -- Day of week (0=Sunday, 6=Saturday) (local time)
      isCompleted BOOLEAN DEFAULT 0,         -- Whether the session ended normally
      createdAt TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `).run()

  // Create indexes for better query performance
  statsDb.prepare(`CREATE INDEX IF NOT EXISTS idx_game_uuid ON game (uuid)`).run()
  statsDb.prepare(`CREATE INDEX IF NOT EXISTS idx_game_date ON game (sessionDate)`).run()
  statsDb.prepare(`CREATE INDEX IF NOT EXISTS idx_game_year_month ON game (sessionYear, sessionMonth)`).run()
  statsDb.prepare(`CREATE INDEX IF NOT EXISTS idx_game_start_time ON game (startTime)`).run()
  statsDb.prepare(`CREATE INDEX IF NOT EXISTS idx_game_completed ON game (isCompleted)`).run()
  statsDb.prepare(`CREATE INDEX IF NOT EXISTS idx_game_launch_method ON game (launchMethod)`).run()

  return { metaDb, statsDb }
}
