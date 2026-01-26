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

// Version management functions
function createVersionTable(db: any) {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS db_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `).run()
}

function getCurrentVersion(db: any): number {
  try {
    const result = db.prepare('SELECT MAX(version) as version FROM db_version').get()
    return result?.version || 0
  } catch {
    return 0
  }
}

function updateVersion(db: any, version: number) {
  db.prepare('INSERT OR REPLACE INTO db_version (version) VALUES (?)').run(version)
  console.log(`Database updated to version ${version}`)
}

// Migration V1: Add dateAdded column
function migrateToV1(metaDb: any) {
  console.log('Starting migration to V1: Adding dateAdded column...')

  try {
    metaDb.prepare(`ALTER TABLE games ADD COLUMN dateAdded TEXT`).run()
    console.log('Added dateAdded column to games table')
  } catch (error: any) {
    if (error.message && !error.message.includes('duplicate column name')) {
      console.error('Error adding dateAdded column:', error)
      throw error
    }
  }

  // Set current timestamp for existing games that don't have dateAdded
  metaDb.prepare(`
    UPDATE games 
    SET dateAdded = datetime('now') 
    WHERE dateAdded IS NULL OR dateAdded = ''
  `).run()

  console.log('Migration to V1 completed successfully!')
}

// Migration V2: Create metadata tables and migrate data
function migrateToV2(metaDb: any, libPath: string) {
  console.log('Starting migration to V2: Creating metadata tables...')

  const dbPath_metadata = path.join(libPath, 'metadata.db')

  // Backup database before migration
  const backupPath = path.join(libPath, `metadata.db.backup.v1.${Date.now()}`)
  try {
    fs.copyFileSync(dbPath_metadata, backupPath)
    console.log(`Backup created: ${backupPath}`)
  } catch (error) {
    console.error('Failed to create backup:', error)
  }

  // Use transaction for atomic migration
  const migrate = metaDb.transaction(() => {
    // Create metadata tables
    metaDb.prepare(`
      CREATE TABLE IF NOT EXISTS genres (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      )
    `).run()

    metaDb.prepare(`
      CREATE TABLE IF NOT EXISTS developers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      )
    `).run()

    metaDb.prepare(`
      CREATE TABLE IF NOT EXISTS publishers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      )
    `).run()

    metaDb.prepare(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      )
    `).run()

    // Create junction tables for many-to-many relationships
    metaDb.prepare(`
      CREATE TABLE IF NOT EXISTS game_genres (
        game_uuid TEXT NOT NULL,
        genre_id INTEGER NOT NULL,
        FOREIGN KEY (game_uuid) REFERENCES games(uuid) ON DELETE CASCADE,
        FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE,
        PRIMARY KEY (game_uuid, genre_id)
      )
    `).run()

    metaDb.prepare(`
      CREATE TABLE IF NOT EXISTS game_developers (
        game_uuid TEXT NOT NULL,
        developer_id INTEGER NOT NULL,
        FOREIGN KEY (game_uuid) REFERENCES games(uuid) ON DELETE CASCADE,
        FOREIGN KEY (developer_id) REFERENCES developers(id) ON DELETE CASCADE,
        PRIMARY KEY (game_uuid, developer_id)
      )
    `).run()

    metaDb.prepare(`
      CREATE TABLE IF NOT EXISTS game_publishers (
        game_uuid TEXT NOT NULL,
        publisher_id INTEGER NOT NULL,
        FOREIGN KEY (game_uuid) REFERENCES games(uuid) ON DELETE CASCADE,
        FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE,
        PRIMARY KEY (game_uuid, publisher_id)
      )
    `).run()

    metaDb.prepare(`
      CREATE TABLE IF NOT EXISTS game_tags (
        game_uuid TEXT NOT NULL,
        tag_id INTEGER NOT NULL,
        FOREIGN KEY (game_uuid) REFERENCES games(uuid) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (game_uuid, tag_id)
      )
    `).run()

    // Create indexes for better query performance
    metaDb.prepare('CREATE INDEX IF NOT EXISTS idx_game_genres_game ON game_genres(game_uuid)').run()
    metaDb.prepare('CREATE INDEX IF NOT EXISTS idx_game_genres_genre ON game_genres(genre_id)').run()
    metaDb.prepare('CREATE INDEX IF NOT EXISTS idx_game_developers_game ON game_developers(game_uuid)').run()
    metaDb.prepare('CREATE INDEX IF NOT EXISTS idx_game_developers_dev ON game_developers(developer_id)').run()
    metaDb.prepare('CREATE INDEX IF NOT EXISTS idx_game_publishers_game ON game_publishers(game_uuid)').run()
    metaDb.prepare('CREATE INDEX IF NOT EXISTS idx_game_publishers_pub ON game_publishers(publisher_id)').run()
    metaDb.prepare('CREATE INDEX IF NOT EXISTS idx_game_tags_game ON game_tags(game_uuid)').run()
    metaDb.prepare('CREATE INDEX IF NOT EXISTS idx_game_tags_tag ON game_tags(tag_id)').run()

    console.log('Metadata tables and indexes created successfully')

    // Migrate existing data
    console.log('Migrating existing game data to new structure...')

    const games = metaDb.prepare('SELECT uuid, genre, developer, publisher, tags FROM games').all()
    let migratedCount = 0

    for (const game of games) {
      // Migrate genres (comma-separated in TEXT field)
      if (game.genre && game.genre.trim()) {
        const genreNames = game.genre.split(',').map((s: string) => s.trim()).filter(Boolean)
        for (const genreName of genreNames) {
          try {
            metaDb.prepare('INSERT OR IGNORE INTO genres (name) VALUES (?)').run(genreName)
            const genre = metaDb.prepare('SELECT id FROM genres WHERE name = ?').get(genreName)
            if (genre) {
              metaDb.prepare('INSERT OR IGNORE INTO game_genres (game_uuid, genre_id) VALUES (?, ?)').run(game.uuid, genre.id)
            }
          } catch (error) {
            console.error(`Failed to migrate genre "${genreName}" for game ${game.uuid}:`, error)
          }
        }
      }

      // Migrate developers
      if (game.developer && game.developer.trim()) {
        const devNames = game.developer.split(',').map((s: string) => s.trim()).filter(Boolean)
        for (const devName of devNames) {
          try {
            metaDb.prepare('INSERT OR IGNORE INTO developers (name) VALUES (?)').run(devName)
            const dev = metaDb.prepare('SELECT id FROM developers WHERE name = ?').get(devName)
            if (dev) {
              metaDb.prepare('INSERT OR IGNORE INTO game_developers (game_uuid, developer_id) VALUES (?, ?)').run(game.uuid, dev.id)
            }
          } catch (error) {
            console.error(`Failed to migrate developer "${devName}" for game ${game.uuid}:`, error)
          }
        }
      }

      // Migrate publishers
      if (game.publisher && game.publisher.trim()) {
        const pubNames = game.publisher.split(',').map((s: string) => s.trim()).filter(Boolean)
        for (const pubName of pubNames) {
          try {
            metaDb.prepare('INSERT OR IGNORE INTO publishers (name) VALUES (?)').run(pubName)
            const pub = metaDb.prepare('SELECT id FROM publishers WHERE name = ?').get(pubName)
            if (pub) {
              metaDb.prepare('INSERT OR IGNORE INTO game_publishers (game_uuid, publisher_id) VALUES (?, ?)').run(game.uuid, pub.id)
            }
          } catch (error) {
            console.error(`Failed to migrate publisher "${pubName}" for game ${game.uuid}:`, error)
          }
        }
      }

      // Migrate tags (JSON array in TEXT field)
      if (game.tags) {
        try {
          const tagArray = JSON.parse(game.tags)
          if (Array.isArray(tagArray)) {
            for (const tagName of tagArray) {
              if (tagName && typeof tagName === 'string' && tagName.trim()) {
                const cleanTag = tagName.trim()
                metaDb.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').run(cleanTag)
                const tag = metaDb.prepare('SELECT id FROM tags WHERE name = ?').get(cleanTag)
                if (tag) {
                  metaDb.prepare('INSERT OR IGNORE INTO game_tags (game_uuid, tag_id) VALUES (?, ?)').run(game.uuid, tag.id)
                }
              }
            }
          }
        } catch (error) {
          console.error(`Failed to parse tags for game ${game.uuid}:`, error)
        }
      }

      migratedCount++
    }

    console.log(`Successfully migrated ${migratedCount} games to new structure`)
  })

  try {
    migrate()
    console.log('Migration to V2 completed successfully!')
  } catch (error) {
    console.error('Migration to V2 failed:', error)
    throw error
  }
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

  // Enable foreign key constraints
  metaDb.pragma('foreign_keys = ON')

  // Initialize game database schema (base structure)
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
      genre TEXT,        -- Kept for backward compatibility, new code uses game_genres table
      developer TEXT,    -- Kept for backward compatibility, new code uses game_developers table
      publisher TEXT,    -- Kept for backward compatibility, new code uses game_publishers table
      releaseDate TEXT,
      communityScore NUMERIC DEFAULT 0,
      personalScore NUMERIC DEFAULT 0,
      tags TEXT,         -- Kept for backward compatibility, new code uses game_tags table
      links TEXT,        -- use JSON.stringify to store, use JSON.parse to retrieve
      description TEXT,  -- use JSON.stringify to store, use JSON.parse to retrieve
      actions TEXT,      -- use JSON.stringify to store, use JSON.parse to retrieve
      procMonMode NUMERIC DEFAULT 1,      -- file:0 / folder:1 / process:2
      procNames TEXT,                     -- use JSON.stringify to store process names array when procMonMode=2
      dateAdded TEXT                      -- ISO 8601 format: YYYY-MM-DD HH:MM:SS (UTC)
    )
  `).run()

  // Version management and migrations
  createVersionTable(metaDb)
  const currentVersion = getCurrentVersion(metaDb)

  console.log(`Current database version: ${currentVersion}`)

  // Execute migrations sequentially
  if (currentVersion < 1) {
    migrateToV1(metaDb)
    updateVersion(metaDb, 1)
  }

  if (currentVersion < 2) {
    migrateToV2(metaDb, libPath)
    updateVersion(metaDb, 2)
  }

  console.log('Metadata database initialization completed')

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
