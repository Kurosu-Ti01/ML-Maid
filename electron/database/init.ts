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

// ==========================================
//  Metadata Database Migrations
// ==========================================

// Metadata.db Migration V1: Add dateAdded column
function migrateMetaToV1(metaDb: any) {
  console.log('Starting metadata.db migration to V1: Adding dateAdded column...')

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

  console.log('metadata.db migration to V1 completed successfully!')
}

// Metadata.db Migration V2: Create metadata tables and migrate data
function migrateMetaToV2(metaDb: any, libPath: string) {
  console.log('Starting metadata.db migration to V2: Creating metadata tables...')

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
    console.log('metadata.db migration to V2 completed successfully!')
  } catch (error) {
    console.error('metadata.db migration to V2 failed:', error)
    throw error
  }
}

// Metadata.db Migration V3: Convert date fields to Unix timestamps and remove deprecated columns
function migrateMetaToV3(metaDb: any, libPath: string) {
  console.log('Starting metadata.db migration to V3: Converting dates to timestamps and removing deprecated columns...')

  const dbPath_metadata = path.join(libPath, 'metadata.db')

  // Backup database before migration
  const backupPath = path.join(libPath, `metadata.db.backup.v2.${Date.now()}`)
  try {
    fs.copyFileSync(dbPath_metadata, backupPath)
    console.log(`Backup created: ${backupPath}`)
  } catch (error) {
    console.error('Failed to create backup:', error)
  }

  // Temporarily disable foreign keys during table swap to avoid cascading deletes on junction tables.
  metaDb.pragma('foreign_keys = OFF')

  // Use transaction for atomic migration
  const migrate = metaDb.transaction(() => {
    console.log('Creating new games table with timestamp fields...')

    // Create new table with updated schema
    metaDb.prepare(`
      CREATE TABLE IF NOT EXISTS games_new (
        uuid TEXT PRIMARY KEY,
        title TEXT,
        coverImage TEXT,
        backgroundImage TEXT,
        iconImage TEXT,
        lastPlayed NUMERIC,          -- Unix timestamp in milliseconds, NULL if never played
        timePlayed NUMERIC DEFAULT 0,
        workingDir TEXT,
        folderSize NUMERIC DEFAULT 0,
        releaseDate NUMERIC,         -- Unix timestamp in milliseconds, NULL if unknown
        communityScore NUMERIC DEFAULT 0,
        personalScore NUMERIC DEFAULT 0,
        links TEXT,                  -- JSON string
        description TEXT,            -- JSON string
        actions TEXT,                -- JSON string
        procMonMode NUMERIC DEFAULT 1,  -- file:0 / folder:1 / process:2
        procNames TEXT,              -- JSON string for process names array
        dateAdded NUMERIC            -- Unix timestamp in milliseconds (when game was added to library)
      )
    `).run()

    console.log('Migrating data from old table to new table...')

    // Copy data from old table to new table, converting date strings to timestamps
    const games = metaDb.prepare(`
      SELECT uuid, title, coverImage, backgroundImage, iconImage, 
             lastPlayed, timePlayed, workingDir, folderSize,
             releaseDate, communityScore, personalScore,
             links, description, actions, procMonMode, procNames, dateAdded
      FROM games
    `).all()

    const insertStmt = metaDb.prepare(`
      INSERT INTO games_new (
        uuid, title, coverImage, backgroundImage, iconImage,
        lastPlayed, timePlayed, workingDir, folderSize,
        releaseDate, communityScore, personalScore,
        links, description, actions, procMonMode, procNames, dateAdded
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    let migratedCount = 0
    for (const game of games) {
      try {
        // Convert date strings to timestamps
        const lastPlayed = game.lastPlayed && game.lastPlayed !== ''
          ? (typeof game.lastPlayed === 'number' ? game.lastPlayed : new Date(game.lastPlayed).getTime())
          : null
        const releaseDate = game.releaseDate && game.releaseDate !== ''
          ? (typeof game.releaseDate === 'number' ? game.releaseDate : new Date(game.releaseDate).getTime())
          : null
        const dateAdded = game.dateAdded && game.dateAdded !== ''
          ? (typeof game.dateAdded === 'number' ? game.dateAdded : new Date(game.dateAdded).getTime())
          : Date.now()

        insertStmt.run(
          game.uuid,
          game.title,
          game.coverImage,
          game.backgroundImage,
          game.iconImage,
          lastPlayed,
          game.timePlayed || 0,
          game.workingDir,
          game.folderSize || 0,
          releaseDate,
          game.communityScore || 0,
          game.personalScore || 0,
          game.links,
          game.description,
          game.actions,
          game.procMonMode ?? 1,
          game.procNames,
          dateAdded
        )
        migratedCount++
      } catch (error) {
        console.error(`Failed to migrate game ${game.uuid}:`, error)
      }
    }

    console.log(`Successfully migrated ${migratedCount} games with new timestamp format`)

    // Drop old table and rename new table
    metaDb.prepare('DROP TABLE games').run()
    metaDb.prepare('ALTER TABLE games_new RENAME TO games').run()

    console.log('Old table dropped and new table renamed')
  })

  try {
    migrate()
    console.log(' metadata.db migration to V3 completed successfully!')
  } catch (error) {
    console.error('metadata.db migration to V3 failed:', error)
    throw error
  } finally {
    metaDb.pragma('foreign_keys = ON')
  }
}

// ==========================================
//  Statistics Database Migrations
// ==========================================

// statistics.db Migration V1: Convert startTime/endTime from TEXT to NUMERIC timestamps
function migrateStatsToV1(statsDb: any, libPath: string) {
  console.log('Starting statistics.db migration to V1: Converting date fields to timestamps...')

  const dbPath_statistics = path.join(libPath, 'statistics.db')

  // Backup database before migration
  const backupPath = path.join(libPath, `statistics.db.backup.v0.${Date.now()}`)
  try {
    fs.copyFileSync(dbPath_statistics, backupPath)
    console.log(`Statistics backup created: ${backupPath}`)
  } catch (error) {
    console.error('Failed to create statistics backup:', error)
  }

  const migrate = statsDb.transaction(() => {
    console.log('Creating new game table with timestamp fields...')

    statsDb.prepare(`
      CREATE TABLE IF NOT EXISTS game_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT NOT NULL,
        title TEXT,
        startTime NUMERIC NOT NULL,            -- Unix timestamp in milliseconds (UTC)
        endTime NUMERIC,                       -- Unix timestamp in milliseconds (UTC), NULL if ongoing
        durationSeconds INTEGER,
        launchMethod TEXT,
        executablePath TEXT,
        exitCode INTEGER,
        sessionDate TEXT NOT NULL,             -- YYYY-MM-DD (local date), kept for easy date grouping
        sessionYear INTEGER NOT NULL,
        sessionMonth INTEGER NOT NULL,
        sessionWeek INTEGER NOT NULL,
        sessionDayOfWeek INTEGER NOT NULL,
        isCompleted BOOLEAN DEFAULT 0,
        createdAt NUMERIC
      )
    `).run()

    console.log('Migrating statistics data...')

    const sessions = statsDb.prepare(`
      SELECT id, uuid, title, startTime, endTime, durationSeconds,
             launchMethod, executablePath, exitCode, sessionDate,
             sessionYear, sessionMonth, sessionWeek, sessionDayOfWeek,
             isCompleted, createdAt
      FROM game
    `).all()

    const insertStmt = statsDb.prepare(`
      INSERT INTO game_new (
        id, uuid, title, startTime, endTime, durationSeconds,
        launchMethod, executablePath, exitCode, sessionDate,
        sessionYear, sessionMonth, sessionWeek, sessionDayOfWeek,
        isCompleted, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    let migratedCount = 0
    for (const session of sessions) {
      try {
        // Convert startTime string (UTC) to timestamp
        let startTimeTs: number
        if (typeof session.startTime === 'number') {
          startTimeTs = session.startTime
        } else {
          startTimeTs = new Date(session.startTime + 'Z').getTime()
        }

        // Convert endTime string (UTC) to timestamp
        let endTimeTs: number | null = null
        if (session.endTime) {
          if (typeof session.endTime === 'number') {
            endTimeTs = session.endTime
          } else {
            endTimeTs = new Date(session.endTime + 'Z').getTime()
          }
        }

        // Convert createdAt to timestamp
        let createdAtTs: number | null = null
        if (session.createdAt) {
          if (typeof session.createdAt === 'number') {
            createdAtTs = session.createdAt
          } else {
            createdAtTs = new Date(session.createdAt).getTime()
          }
        }

        insertStmt.run(
          session.id,
          session.uuid,
          session.title,
          startTimeTs,
          endTimeTs,
          session.durationSeconds,
          session.launchMethod,
          session.executablePath,
          session.exitCode,
          session.sessionDate,  // Keep as-is (YYYY-MM-DD string for grouping)
          session.sessionYear,
          session.sessionMonth,
          session.sessionWeek,
          session.sessionDayOfWeek,
          session.isCompleted,
          createdAtTs
        )
        migratedCount++
      } catch (error) {
        console.error(`Failed to migrate session ${session.id}:`, error)
      }
    }

    console.log(`Successfully migrated ${migratedCount} sessions`)

    // Drop old table and rename
    statsDb.prepare('DROP TABLE game').run()
    statsDb.prepare('ALTER TABLE game_new RENAME TO game').run()

    // Recreate indexes
    statsDb.prepare('CREATE INDEX IF NOT EXISTS idx_game_uuid ON game (uuid)').run()
    statsDb.prepare('CREATE INDEX IF NOT EXISTS idx_game_date ON game (sessionDate)').run()
    statsDb.prepare('CREATE INDEX IF NOT EXISTS idx_game_year_month ON game (sessionYear, sessionMonth)').run()
    statsDb.prepare('CREATE INDEX IF NOT EXISTS idx_game_start_time ON game (startTime)').run()
    statsDb.prepare('CREATE INDEX IF NOT EXISTS idx_game_completed ON game (isCompleted)').run()
    statsDb.prepare('CREATE INDEX IF NOT EXISTS idx_game_launch_method ON game (launchMethod)').run()

    console.log('Statistics table rebuilt and indexes recreated')
  })

  try {
    migrate()
    console.log('statistics.db migration to V1 completed successfully!')
  } catch (error) {
    console.error('statistics.db migration to V1 failed:', error)
    throw error
  }
}

// statistics.db Migration V2: Remove title & executablePath columns, refactor sessionDayOfWeek to 0=Monday..6=Sunday
function migrateStatsToV2(statsDb: any, libPath: string) {
  console.log('Starting statistics.db migration to V2: Removing title/executablePath, refactoring sessionDayOfWeek...')

  const dbPath_statistics = path.join(libPath, 'statistics.db')

  // Backup database before migration
  const backupPath = path.join(libPath, `statistics.db.backup.v1.${Date.now()}`)
  try {
    fs.copyFileSync(dbPath_statistics, backupPath)
    console.log(`Statistics backup created: ${backupPath}`)
  } catch (error) {
    console.error('Failed to create statistics backup:', error)
  }

  const migrate = statsDb.transaction(() => {
    console.log('Creating new game table without title/executablePath and with new sessionDayOfWeek...')

    statsDb.prepare(`
      CREATE TABLE IF NOT EXISTS game_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT NOT NULL,
        startTime NUMERIC NOT NULL,            -- Unix timestamp in milliseconds (UTC)
        endTime NUMERIC,                       -- Unix timestamp in milliseconds (UTC), NULL if ongoing
        durationSeconds INTEGER,
        launchMethod TEXT,
        exitCode INTEGER,
        sessionDate TEXT NOT NULL,             -- YYYY-MM-DD (local date), kept for easy date grouping
        sessionYear INTEGER NOT NULL,
        sessionMonth INTEGER NOT NULL,
        sessionWeek INTEGER NOT NULL,
        sessionDayOfWeek INTEGER NOT NULL,     -- 0=Monday, 6=Sunday
        isCompleted BOOLEAN DEFAULT 0,
        createdAt NUMERIC
      )
    `).run()

    console.log('Migrating statistics data with sessionDayOfWeek conversion...')

    const sessions = statsDb.prepare(`
      SELECT id, uuid, startTime, endTime, durationSeconds,
             launchMethod, exitCode, sessionDate,
             sessionYear, sessionMonth, sessionWeek, sessionDayOfWeek,
             isCompleted, createdAt
      FROM game
    `).all()

    const insertStmt = statsDb.prepare(`
      INSERT INTO game_new (
        id, uuid, startTime, endTime, durationSeconds,
        launchMethod, exitCode, sessionDate,
        sessionYear, sessionMonth, sessionWeek, sessionDayOfWeek,
        isCompleted, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    let migratedCount = 0
    for (const session of sessions) {
      try {
        // Convert sessionDayOfWeek from old format (0=Sunday, 6=Saturday)
        // to new format (0=Monday, 6=Sunday)
        const oldDow = session.sessionDayOfWeek as number
        const newDow = oldDow === 0 ? 6 : oldDow - 1

        insertStmt.run(
          session.id,
          session.uuid,
          session.startTime,
          session.endTime,
          session.durationSeconds,
          session.launchMethod,
          session.exitCode,
          session.sessionDate,
          session.sessionYear,
          session.sessionMonth,
          session.sessionWeek,
          newDow,
          session.isCompleted,
          session.createdAt
        )
        migratedCount++
      } catch (error) {
        console.error(`Failed to migrate session ${session.id}:`, error)
      }
    }

    console.log(`Successfully migrated ${migratedCount} sessions`)

    // Drop old table and rename
    statsDb.prepare('DROP TABLE game').run()
    statsDb.prepare('ALTER TABLE game_new RENAME TO game').run()

    // Recreate indexes
    statsDb.prepare('CREATE INDEX IF NOT EXISTS idx_game_uuid ON game (uuid)').run()
    statsDb.prepare('CREATE INDEX IF NOT EXISTS idx_game_date ON game (sessionDate)').run()
    statsDb.prepare('CREATE INDEX IF NOT EXISTS idx_game_year_month ON game (sessionYear, sessionMonth)').run()
    statsDb.prepare('CREATE INDEX IF NOT EXISTS idx_game_start_time ON game (startTime)').run()
    statsDb.prepare('CREATE INDEX IF NOT EXISTS idx_game_completed ON game (isCompleted)').run()
    statsDb.prepare('CREATE INDEX IF NOT EXISTS idx_game_launch_method ON game (launchMethod)').run()

    console.log('Statistics table rebuilt and indexes recreated')
  })

  try {
    migrate()
    console.log('statistics.db migration to V2 completed successfully!')
  } catch (error) {
    console.error('statistics.db migration to V2 failed:', error)
    throw error
  }
}

// ==========================================
//  Database Initialization
// ==========================================

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
  // Note: This schema is for V3+. Older versions will be migrated automatically.
  metaDb.prepare(`
    CREATE TABLE IF NOT EXISTS games (
      uuid TEXT PRIMARY KEY,
      title TEXT,
      coverImage TEXT,
      backgroundImage TEXT,
      iconImage TEXT,
      lastPlayed NUMERIC,          -- Unix timestamp in milliseconds, NULL if never played
      timePlayed NUMERIC DEFAULT 0,
      workingDir TEXT,
      folderSize NUMERIC DEFAULT 0,
      genre TEXT,                  -- Temporary for migration V1->V2, removed in V3
      developer TEXT,              -- Temporary for migration V1->V2, removed in V3
      publisher TEXT,              -- Temporary for migration V1->V2, removed in V3
      releaseDate NUMERIC,         -- Unix timestamp in milliseconds, NULL if unknown
      communityScore NUMERIC DEFAULT 0,
      personalScore NUMERIC DEFAULT 0,
      tags TEXT,                   -- Temporary for migration V1->V2, removed in V3
      links TEXT,                  -- JSON string
      description TEXT,            -- JSON string
      actions TEXT,                -- JSON string
      procMonMode NUMERIC DEFAULT 1,  -- file:0 / folder:1 / process:2
      procNames TEXT,              -- JSON string for process names array
      dateAdded NUMERIC            -- Unix timestamp in milliseconds (when game was added to library)
    )
  `).run()

  // Version management and migrations
  createVersionTable(metaDb)
  const currentVersion = getCurrentVersion(metaDb)

  console.log(`Current metadata database version: ${currentVersion}`)

  // Execute migrations sequentially
  if (currentVersion < 1) {
    migrateMetaToV1(metaDb)
    updateVersion(metaDb, 1)
  }

  if (currentVersion < 2) {
    migrateMetaToV2(metaDb, libPath)
    updateVersion(metaDb, 2)
  }

  if (currentVersion < 3) {
    migrateMetaToV3(metaDb, libPath)
    updateVersion(metaDb, 3)
  }

  console.log('Metadata database initialization completed')

  // Initialize statistics database schema
  // Note: This schema is for V2+. Older versions will be migrated automatically.
  statsDb.prepare(`
    CREATE TABLE IF NOT EXISTS game (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT NOT NULL,
      title TEXT,                            -- Deprecated: kept for V1 migration compatibility, removed in V2
      startTime NUMERIC NOT NULL,            -- Unix timestamp in milliseconds (UTC)
      endTime NUMERIC,                       -- Unix timestamp in milliseconds (UTC), NULL if session is ongoing
      durationSeconds INTEGER,               -- Duration in seconds, calculated when session ends
      launchMethod TEXT,                     -- Launch method name (e.g., "Direct Launch", "Steam", "Launcher")
      executablePath TEXT,                   -- Deprecated: kept for V1 migration compatibility, removed in V2
      exitCode INTEGER,                      -- Process exit code, NULL if session is ongoing
      sessionDate TEXT NOT NULL,             -- YYYY-MM-DD format for easy date-based queries (local date)
      sessionYear INTEGER NOT NULL,          -- Year for yearly statistics (local time)
      sessionMonth INTEGER NOT NULL,         -- Month (1-12) for monthly statistics (local time)
      sessionWeek INTEGER NOT NULL,          -- Week number (1-53) for weekly statistics (local time)
      sessionDayOfWeek INTEGER NOT NULL,     -- Day of week (0=Monday, 6=Sunday) (local time)
      isCompleted BOOLEAN DEFAULT 0,         -- Whether the session ended normally
      createdAt NUMERIC DEFAULT (strftime('%s', 'now') * 1000) -- Unix timestamp in milliseconds
    )
  `).run()

  // Create indexes for better query performance
  statsDb.prepare(`CREATE INDEX IF NOT EXISTS idx_game_uuid ON game (uuid)`).run()
  statsDb.prepare(`CREATE INDEX IF NOT EXISTS idx_game_date ON game (sessionDate)`).run()
  statsDb.prepare(`CREATE INDEX IF NOT EXISTS idx_game_year_month ON game (sessionYear, sessionMonth)`).run()
  statsDb.prepare(`CREATE INDEX IF NOT EXISTS idx_game_start_time ON game (startTime)`).run()
  statsDb.prepare(`CREATE INDEX IF NOT EXISTS idx_game_completed ON game (isCompleted)`).run()
  statsDb.prepare(`CREATE INDEX IF NOT EXISTS idx_game_launch_method ON game (launchMethod)`).run()

  // Statistics database version management and migrations
  createVersionTable(statsDb)
  const statsVersion = getCurrentVersion(statsDb)
  console.log(`Current statistics database version: ${statsVersion}`)

  if (statsVersion < 1) {
    migrateStatsToV1(statsDb, libPath)
    updateVersion(statsDb, 1)
  }

  if (statsVersion < 2) {
    migrateStatsToV2(statsDb, libPath)
    updateVersion(statsDb, 2)
  }

  console.log('Statistics database initialization completed')

  return { metaDb, statsDb }
}
