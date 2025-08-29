import { app, BrowserWindow } from 'electron'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
import { ipcMain, dialog, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { spawn } from 'node:child_process'

// To avoid the "ReferenceError: __filename is not defined" error in ESM
// See 👉 https://github.com/TooTallNate/node-bindings/issues/81
// better-sqlite3 uses bindings internally, so we need to use createRequire to load it
// u may need to rebuild it with `npx electron-rebuild -f -w better-sqlite3`
// import Database from 'better-sqlite3'
const Database = require('better-sqlite3')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

// Database and images paths
const isDev = !app.isPackaged;
const appDataPath = isDev
  ? process.env.APP_ROOT  // Development: use project root
  : path.dirname(process.execPath);  // Production: use executable directory

const libPath = path.join(appDataPath, 'library');
const tempPath = path.join(appDataPath, 'temp');

if (!fs.existsSync(libPath)) {
  fs.mkdirSync(libPath, { recursive: true })
}
if (!fs.existsSync(tempPath)) {
  fs.mkdirSync(tempPath, { recursive: true })
}
const dbPath_game = path.join(libPath, 'metadata.db');
const dbPath_statistics = path.join(libPath, 'statistics.db');
const imgPath_game = path.join(libPath, 'images');
if (!fs.existsSync(imgPath_game)) {
  fs.mkdirSync(imgPath_game, { recursive: true })
}
const db = new Database(dbPath_game);
const statsDb = new Database(dbPath_statistics);

// Helper function to get MIME type from file extension
function getMimeType(extension: string): string {
  const mimeTypes: { [key: string]: string } = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon'
  };

  return mimeTypes[extension.toLowerCase()] || 'image/jpeg';
}

// Helper function to format ISO datetime to local display format
function formatISOToLocal(isoDateTime: string): string {
  if (!isoDateTime) return '';
  try {
    const date = new Date(isoDateTime + 'Z'); // Add Z to indicate UTC
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.error('Error formatting ISO datetime:', error);
    return '';
  }
}

// Helper function to format a Date object to ISO datetime string (UTC)
function formatDateToISO(date: Date): string {
  return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ''); // Replace T with space, remove milliseconds and Z
}

// Helper function to get week number of the year (ISO 8601 standard, Monday-based)
function getWeekNumber(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000); // 604800000 = 7 * 24 * 3600 * 1000
}

// initialize the database
db.prepare(`
  CREATE TABLE IF NOT EXISTS games (
    uuid TEXT PRIMARY KEY,
    title TEXT,
    coverImage TEXT,
    backgroundImage TEXT,
    iconImage TEXT,
    lastPlayed TEXT,   -- ISO 8601 format: YYYY-MM-DD HH:MM:SS (UTC)
    timePlayed  NUMERIC DEFAULT 0,
    installPath TEXT,
    installSize NUMERIC DEFAULT 0,
    genre TEXT,
    developer TEXT,
    publisher TEXT,
    releaseDate TEXT,
    communityScore NUMERIC DEFAULT 0,
    personalScore NUMERIC DEFAULT 0,
    tags TEXT,         -- use JSON.stringify to store, use JSON.parse to retrieve
    links TEXT,        -- use JSON.stringify to store, use JSON.parse to retrieve
    description TEXT,  -- use JSON.stringify to store, use JSON.parse to retrieve
    actions TEXT       -- use JSON.stringify to store, use JSON.parse to retrieve
  )
`).run();

// initialize the statistics database
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
`).run();

// Create indexes for better query performance
statsDb.prepare(`CREATE INDEX IF NOT EXISTS idx_game_uuid ON game (uuid)`).run();
statsDb.prepare(`CREATE INDEX IF NOT EXISTS idx_game_date ON game (sessionDate)`).run();
statsDb.prepare(`CREATE INDEX IF NOT EXISTS idx_game_year_month ON game (sessionYear, sessionMonth)`).run();
statsDb.prepare(`CREATE INDEX IF NOT EXISTS idx_game_start_time ON game (startTime)`).run();
statsDb.prepare(`CREATE INDEX IF NOT EXISTS idx_game_completed ON game (isCompleted)`).run();
statsDb.prepare(`CREATE INDEX IF NOT EXISTS idx_game_launch_method ON game (launchMethod)`).run();

// pick a game by uuid
ipcMain.handle('get-game-by-id', (_, gameid: string) => {
  const result = db.prepare('SELECT * FROM games WHERE uuid = ?').get(gameid);

  if (result) {
    // Parse JSON fields back to objects/arrays
    try {
      result.tags = result.tags ? JSON.parse(result.tags) : [];
      result.links = result.links ? JSON.parse(result.links) : {};
      result.description = result.description ? JSON.parse(result.description) : [];
      result.actions = result.actions ? JSON.parse(result.actions) : [];

      // Convert ISO datetime to formatted date string for display
      result.lastPlayedDisplay = formatISOToLocal(result.lastPlayed || '');
    } catch (error) {
      console.error('Error parsing JSON fields for game:', gameid, error);
      // Fallback to default values if parsing fails
      result.tags = [];
      result.links = {};
      result.description = [];
      result.actions = [];
      result.lastPlayedDisplay = '';
    }
  }

  return result;
});

// get games list (lightweight - only fields needed for list display)
ipcMain.handle('get-games-list', () => {
  // Only select the fields needed for list display - much faster!
  const games = db.prepare('SELECT uuid, title, iconImage, genre, lastPlayed FROM games').all();

  // Add formatted display date for each game
  return games.map((game: any) => ({
    ...game,
    lastPlayedDisplay: formatISOToLocal(game.lastPlayed || '')
  }));
});

// Format ISO datetime for display (utility function for frontend)
ipcMain.handle('format-datetime', (_, isoDateTime: string) => {
  return formatISOToLocal(isoDateTime);
});

// Add a new game
ipcMain.handle('add-game', async (_, game: gameData) => {
  try {
    // First, finalize images (move from temp to library)
    const imageResult = await new Promise<{ success: boolean, movedFiles?: any[] }>((resolve) => {
      // Simulate the finalize-game-images call
      const tempDir = path.join(tempPath, 'images', game.uuid);
      const libraryDir = path.join(imgPath_game, game.uuid);

      if (!fs.existsSync(tempDir)) {
        resolve({ success: true, movedFiles: [] });
        return;
      }

      if (!fs.existsSync(libraryDir)) {
        fs.mkdirSync(libraryDir, { recursive: true });
      }

      const tempFiles = fs.readdirSync(tempDir);
      const movedFiles: any[] = [];

      for (const fileName of tempFiles) {
        const tempFilePath = path.join(tempDir, fileName);
        const libraryFilePath = path.join(libraryDir, fileName);

        fs.copyFileSync(tempFilePath, libraryFilePath);
        fs.unlinkSync(tempFilePath);

        movedFiles.push({
          fileName,
          oldPath: tempFilePath,
          newPath: libraryFilePath
        });
      }

      try {
        fs.rmdirSync(tempDir);
      } catch (err) {
        // Ignore error
      }

      resolve({ success: true, movedFiles });
    });

    // Update image paths from temp to library paths (use relative paths)
    const updatedGame = { ...game };
    if (imageResult.success && imageResult.movedFiles) {
      imageResult.movedFiles.forEach((file: any) => {
        const imageType = path.basename(file.fileName, path.extname(file.fileName));
        // Convert absolute path to relative path from appDataPath and normalize separators
        const relativePath = path.relative(appDataPath, file.newPath);
        // Convert Windows backslashes to forward slashes for cross-platform compatibility
        const normalizedPath = relativePath.replace(/\\/g, '/');
        switch (imageType) {
          case 'icon':
            updatedGame.iconImage = normalizedPath;
            break;
          case 'cover':
            updatedGame.coverImage = normalizedPath;
            break;
          case 'background':
            updatedGame.backgroundImage = normalizedPath;
            break;
        }
      });
    }

    const stmt = db.prepare(
      `INSERT INTO games (
      uuid, title, coverImage, backgroundImage, iconImage, lastPlayed, timePlayed,
      installPath, installSize, genre, developer, publisher, releaseDate,
      communityScore, personalScore, tags, links, description, actions
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    stmt.run(
      updatedGame.uuid || '',
      updatedGame.title || '',
      updatedGame.coverImage || '',
      updatedGame.backgroundImage || '',
      updatedGame.iconImage || '',
      updatedGame.lastPlayed || '',
      updatedGame.timePlayed || 0,
      updatedGame.installPath || '',
      updatedGame.installSize || 0,
      updatedGame.genre || '',
      updatedGame.developer || '',
      updatedGame.publisher || '',
      updatedGame.releaseDate || '',
      updatedGame.communityScore || 0,
      updatedGame.personalScore || 0,
      JSON.stringify(updatedGame.tags || []),
      JSON.stringify(updatedGame.links || {}),
      JSON.stringify(updatedGame.description || []),
      JSON.stringify(updatedGame.actions || [])
    );

    // Notify main window to refresh game list
    if (win && !win.isDestroyed()) {
      win.webContents.send('game-list-changed', { action: 'add', game: updatedGame });
    }

    return { success: true };
  } catch (error) {
    console.error('Error adding game:', error);
    throw error;
  }
});

// Update game data
ipcMain.handle('update-game', async (_, game: gameData) => {
  try {
    // First, finalize images (move from temp to library)
    const imageResult = await new Promise<{ success: boolean, movedFiles?: any[] }>((resolve) => {
      const tempDir = path.join(tempPath, 'images', game.uuid);
      const libraryDir = path.join(imgPath_game, game.uuid);

      if (!fs.existsSync(tempDir)) {
        resolve({ success: true, movedFiles: [] });
        return;
      }

      if (!fs.existsSync(libraryDir)) {
        fs.mkdirSync(libraryDir, { recursive: true });
      }

      const tempFiles = fs.readdirSync(tempDir);
      const movedFiles: any[] = [];

      for (const fileName of tempFiles) {
        const tempFilePath = path.join(tempDir, fileName);
        const libraryFilePath = path.join(libraryDir, fileName);

        fs.copyFileSync(tempFilePath, libraryFilePath);
        fs.unlinkSync(tempFilePath);

        movedFiles.push({
          fileName,
          oldPath: tempFilePath,
          newPath: libraryFilePath
        });
      }

      try {
        fs.rmdirSync(tempDir);
      } catch (err) {
        // Ignore error
      }

      resolve({ success: true, movedFiles });
    });

    // Update image paths from temp to library paths (use relative paths)
    const updatedGame = { ...game };
    if (imageResult.success && imageResult.movedFiles) {
      imageResult.movedFiles.forEach((file: any) => {
        const imageType = path.basename(file.fileName, path.extname(file.fileName));
        // Convert absolute path to relative path from appDataPath and normalize separators
        const relativePath = path.relative(appDataPath, file.newPath);
        // Convert Windows backslashes to forward slashes for cross-platform compatibility
        const normalizedPath = relativePath.replace(/\\/g, '/');
        switch (imageType) {
          case 'icon':
            updatedGame.iconImage = normalizedPath;
            break;
          case 'cover':
            updatedGame.coverImage = normalizedPath;
            break;
          case 'background':
            updatedGame.backgroundImage = normalizedPath;
            break;
        }
      });
    }

    const stmt = db.prepare(
      `UPDATE games SET 
      title = ?, coverImage = ?, backgroundImage = ?, iconImage = ?, lastPlayed = ?,
      timePlayed = ?, installPath = ?, installSize = ?, genre = ?, developer = ?,
      publisher = ?, releaseDate = ?, communityScore = ?, personalScore = ?, tags = ?,
      links = ?, description = ?, actions = ? 
    WHERE uuid = ?`
    );

    const result = stmt.run(
      updatedGame.title || '',
      updatedGame.coverImage || '',
      updatedGame.backgroundImage || '',
      updatedGame.iconImage || '',
      updatedGame.lastPlayed || '',
      updatedGame.timePlayed || 0,
      updatedGame.installPath || '',
      updatedGame.installSize || 0,
      updatedGame.genre || '',
      updatedGame.developer || '',
      updatedGame.publisher || '',
      updatedGame.releaseDate || '',
      updatedGame.communityScore || 0,
      updatedGame.personalScore || 0,
      JSON.stringify(updatedGame.tags || []),
      JSON.stringify(updatedGame.links || {}),
      JSON.stringify(updatedGame.description || []),
      JSON.stringify(updatedGame.actions || []),
      updatedGame.uuid
    );

    // Notify main window to refresh game list and game page
    if (win && !win.isDestroyed()) {
      win.webContents.send('game-list-changed', { action: 'update', game: updatedGame });
    }

    return { success: true, changes: result.changes > 0 };
  } catch (error) {
    console.error('Error updating game:', error);
    throw error;
  }
});

// Delete game
ipcMain.handle('delete-game', async (_, uuid: string) => {
  try {
    // First check if the game exists
    const gameData = db.prepare('SELECT * FROM games WHERE uuid = ?').get(uuid);
    if (!gameData) {
      throw new Error(`Game with UUID ${uuid} not found`);
    }

    // Delete the game from database
    const deleteStmt = db.prepare('DELETE FROM games WHERE uuid = ?');
    const result = deleteStmt.run(uuid);

    if (result.changes === 0) {
      throw new Error(`Failed to delete game with UUID ${uuid}`);
    }

    // Delete associated image files
    const gameImageDir = path.join(imgPath_game, uuid);
    if (fs.existsSync(gameImageDir)) {
      try {
        // Remove all files in the game's image directory
        const files = fs.readdirSync(gameImageDir);
        for (const file of files) {
          const filePath = path.join(gameImageDir, file);
          fs.unlinkSync(filePath);
        }
        // Remove the directory itself
        fs.rmdirSync(gameImageDir);
        console.log(`Deleted image directory for game ${uuid}`);
      } catch (imageError) {
        console.warn(`Warning: Failed to delete image directory for game ${uuid}:`, imageError);
        // Don't throw error here, as the database deletion was successful
      }
    }

    // Also clean up any temp images for this game
    const tempImageDir = path.join(tempPath, 'images', uuid);
    if (fs.existsSync(tempImageDir)) {
      try {
        const tempFiles = fs.readdirSync(tempImageDir);
        for (const file of tempFiles) {
          const filePath = path.join(tempImageDir, file);
          fs.unlinkSync(filePath);
        }
        fs.rmdirSync(tempImageDir);
        console.log(`Cleaned up temp images for game ${uuid}`);
      } catch (tempError) {
        console.warn(`Warning: Failed to clean up temp images for game ${uuid}:`, tempError);
      }
    }

    // Notify main window to refresh game list
    if (win && !win.isDestroyed()) {
      win.webContents.send('game-list-changed', { action: 'delete', game: { uuid, title: gameData.title } });
    }

    console.log(`Successfully deleted game: ${gameData.title} (${uuid})`);
    return { success: true, deletedGame: { uuid, title: gameData.title } };
  } catch (error) {
    console.error('Error deleting game:', error);
    throw error;
  }
});

// Get game statistics - daily play time for a specific game (recent days)
ipcMain.handle('get-game-recent-daily-stats', (_, gameUuid: string, days: number = 30) => {
  const query = `
    SELECT 
      sessionDate,
      SUM(durationSeconds) as totalSeconds,
      COUNT(*) as sessionCount
    FROM game 
    WHERE uuid = ? AND isCompleted = 1
    AND sessionDate >= date('now', '-${days} days')
    GROUP BY sessionDate
    ORDER BY sessionDate DESC
  `;
  return statsDb.prepare(query).all(gameUuid);
});

// Internal function to get game daily statistics by date range
function getGameDailyStatsByRange(gameUuid: string, startDate: string, endDate: string) {
  const query = `
    SELECT 
      sessionDate,
      SUM(durationSeconds) as totalSeconds,
      COUNT(*) as sessionCount
    FROM game 
    WHERE uuid = ? AND isCompleted = 1
    AND sessionDate >= ? AND sessionDate <= ?
    GROUP BY sessionDate
    ORDER BY sessionDate DESC
  `;
  return statsDb.prepare(query).all(gameUuid, startDate, endDate);
}

// Internal function to get weekly statistics by date string
function getWeeklyStatisticsByDate(dateString: string) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const weekNumber = getWeekNumber(date);

  const query = `
    SELECT 
      sessionDate,
      sessionDayOfWeek,
      uuid,
      title,
      SUM(durationSeconds) as totalSeconds,
      COUNT(*) as sessionCount
    FROM game 
    WHERE isCompleted = 1 
    AND sessionYear = ? 
    AND sessionWeek = ?
    GROUP BY sessionDate, sessionDayOfWeek, uuid, title
    ORDER BY sessionDayOfWeek ASC, title ASC
  `;
  return statsDb.prepare(query).all(year, weekNumber);
}

// Get weekly statistics for specified date string
ipcMain.handle('get-weekly-stats-by-date', (_, dateString: string) => {
  return getWeeklyStatisticsByDate(dateString);
});

// Get game statistics - daily play time for a specific game (date range)
ipcMain.handle('get-game-daily-stats-range', (_, gameUuid: string, startDate: string, endDate: string) => {
  return getGameDailyStatsByRange(gameUuid, startDate, endDate);
});


// Get overall statistics for all games
ipcMain.handle('get-overall-stats', () => {
  const queries = {
    totalPlayTime: `SELECT SUM(durationSeconds) as total FROM game WHERE isCompleted = 1`,
    totalSessions: `SELECT COUNT(*) as total FROM game WHERE isCompleted = 1`,
    gamesPlayed: `SELECT COUNT(DISTINCT uuid) as total FROM game WHERE isCompleted = 1`,
    todayPlayTime: `SELECT SUM(durationSeconds) as total FROM game WHERE isCompleted = 1 AND sessionDate = date('now', 'localtime')`,
    thisWeekPlayTime: `SELECT SUM(durationSeconds) as total FROM game WHERE isCompleted = 1 AND sessionDate >= date('now', 'weekday 0', '-6 days')`,
    thisMonthPlayTime: `SELECT SUM(durationSeconds) as total FROM game WHERE isCompleted = 1 AND sessionYear = strftime('%Y', 'now') AND sessionMonth = strftime('%m', 'now')`
  };

  const stats: any = {};
  for (const [key, query] of Object.entries(queries)) {
    const result = statsDb.prepare(query).get();
    stats[key] = result ? (result.total || 0) : 0;
  }

  return stats;
});

// Get top played games
ipcMain.handle('get-top-games-stats', (_, limit: number = 10) => {
  const query = `
    SELECT 
      uuid,
      title,
      SUM(durationSeconds) as totalSeconds,
      COUNT(*) as sessionCount,
      MAX(sessionDate) as lastPlayed
    FROM game 
    WHERE isCompleted = 1
    GROUP BY uuid, title
    ORDER BY totalSeconds DESC
    LIMIT ?
  `;
  return statsDb.prepare(query).all(limit);
});

// Get monthly statistics
ipcMain.handle('get-monthly-stats', (_, year?: number) => {
  const targetYear = year || new Date().getFullYear();
  const query = `
    SELECT 
      sessionMonth,
      SUM(durationSeconds) as totalSeconds,
      COUNT(*) as sessionCount,
      COUNT(DISTINCT uuid) as uniqueGames
    FROM game 
    WHERE isCompleted = 1 AND sessionYear = ?
    GROUP BY sessionMonth
    ORDER BY sessionMonth
  `;
  return statsDb.prepare(query).all(targetYear);
});

// Get recent game sessions (updated to include launch method)
ipcMain.handle('get-recent-sessions', (_, limit: number = 20) => {
  const query = `
    SELECT 
      id,
      uuid,
      title,
      startTime,
      endTime,
      durationSeconds,
      sessionDate,
      launchMethod
    FROM game 
    WHERE isCompleted = 1
    ORDER BY startTime DESC
    LIMIT ?
  `;
  return statsDb.prepare(query).all(limit);
});

// Get launch method statistics
ipcMain.handle('get-launch-method-stats', (_, gameUuid?: string) => {
  let query;
  let params: any[] = [];

  if (gameUuid) {
    // Statistics for a specific game
    query = `
      SELECT 
        launchMethod,
        COUNT(*) as sessionCount,
        SUM(durationSeconds) as totalSeconds,
        AVG(durationSeconds) as avgSeconds,
        MAX(sessionDate) as lastUsed
      FROM game 
      WHERE isCompleted = 1 AND uuid = ?
      GROUP BY launchMethod
      ORDER BY sessionCount DESC
    `;
    params = [gameUuid];
  } else {
    // Overall launch method statistics
    query = `
      SELECT 
        launchMethod,
        COUNT(*) as sessionCount,
        SUM(durationSeconds) as totalSeconds,
        COUNT(DISTINCT uuid) as uniqueGames,
        MAX(sessionDate) as lastUsed
      FROM game 
      WHERE isCompleted = 1
      GROUP BY launchMethod
      ORDER BY sessionCount DESC
    `;
  }

  return statsDb.prepare(query).all(...params);
});

// Game process tracking
const activeGameProcesses = new Map<string, {
  process: any,
  startTime: Date,
  gameUuid: string,
  executablePath: string,
  sessionId: number  // Add session ID for tracking
}>();

// Launch game
ipcMain.handle('launch-game', async (_, { gameUuid, executablePath, launchMethodName }: { gameUuid: string, executablePath: string, launchMethodName: string }) => {
  try {
    // Check if the path exists
    if (!fs.existsSync(executablePath)) {
      throw new Error(`Game executable not found at: ${executablePath}`);
    }

    console.log(`Launching game: ${executablePath}`);

    // Get game name for statistics
    const gameData = db.prepare('SELECT title FROM games WHERE uuid = ?').get(gameUuid);
    const gameName = gameData ? gameData.title : 'Unknown Game';

    // Use provided launch method name (should always be provided since name is required)
    if (!launchMethodName) {
      throw new Error('Launch method name is required');
    }

    console.log(`Launch method: ${launchMethodName}`);

    // Launch the game using spawn
    const gameProcess = spawn(executablePath, [], {
      detached: false, // we should monitor the process
      stdio: 'ignore',
      cwd: path.dirname(executablePath) // Set working directory to the game's directory
    });

    const startTime = new Date();
    const processKey = `${gameUuid}_${Date.now()}`;
    const startTimeStr = formatDateToISO(startTime); // Store UTC time in database

    // For statistics, use local date for date/time components
    const year = startTime.getFullYear();
    const month = String(startTime.getMonth() + 1).padStart(2, '0');
    const day = String(startTime.getDate()).padStart(2, '0');
    const sessionDate = `${year}-${month}-${day}`; // Local date in YYYY-MM-DD format

    // Extract date components for statistics (based on local time)
    const sessionYear = startTime.getFullYear();
    const sessionMonth = startTime.getMonth() + 1; // JavaScript months are 0-based
    const sessionWeek = getWeekNumber(startTime);
    const sessionDayOfWeek = startTime.getDay(); // 0=Sunday, 6=Saturday

    // Create session record in statistics database
    const sessionStmt = statsDb.prepare(`
      INSERT INTO game (
        uuid, title, startTime, launchMethod, executablePath, sessionDate, 
        sessionYear, sessionMonth, sessionWeek, sessionDayOfWeek
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const sessionResult = sessionStmt.run(
      gameUuid, gameName, startTimeStr, launchMethodName, executablePath, sessionDate,
      sessionYear, sessionMonth, sessionWeek, sessionDayOfWeek
    );
    const sessionId = sessionResult.lastInsertRowid as number;

    console.log(`Created game session ${sessionId} for game ${gameUuid} (${gameName})`);

    // Store process info for tracking
    activeGameProcesses.set(processKey, {
      process: gameProcess,
      startTime,
      gameUuid,
      executablePath,
      sessionId
    });

    // Monitor process exit
    gameProcess.on('exit', async (code) => {
      const endTime = new Date();
      const processInfo = activeGameProcesses.get(processKey);

      if (processInfo) {
        const sessionTimeSeconds = Math.floor((endTime.getTime() - processInfo.startTime.getTime()) / 1000);
        const endTimeStr = formatDateToISO(endTime);

        console.log(`Game ${gameUuid} session ${processInfo.sessionId} ended with code ${code}. Duration: ${sessionTimeSeconds} seconds`);

        try {
          // Update session record in statistics database
          const updateSessionStmt = statsDb.prepare(`
            UPDATE game 
            SET endTime = ?, durationSeconds = ?, exitCode = ?, isCompleted = 1
            WHERE id = ?
          `);
          updateSessionStmt.run(endTimeStr, sessionTimeSeconds, code, processInfo.sessionId);

          // Get current timePlayed from database
          const currentData = db.prepare('SELECT timePlayed FROM games WHERE uuid = ?').get(gameUuid);
          const currentTimePlayed = currentData ? (currentData.timePlayed || 0) : 0;
          const newTimePlayed = currentTimePlayed + sessionTimeSeconds;

          // Update timePlayed and lastPlayed in database
          const updateStmt = db.prepare('UPDATE games SET timePlayed = ?, lastPlayed = ? WHERE uuid = ?');
          updateStmt.run(newTimePlayed, endTimeStr, gameUuid);

          // Notify main window that game session ended
          if (win && !win.isDestroyed()) {
            win.webContents.send('game-session-ended', {
              gameUuid,
              sessionId: processInfo.sessionId,
              sessionTimeSeconds,
              totalTimePlayed: newTimePlayed,
              executablePath: processInfo.executablePath,
              startTime: formatISOToLocal(formatDateToISO(processInfo.startTime)),
              endTime: formatISOToLocal(endTimeStr)
            });
          }

          console.log(`Updated session ${processInfo.sessionId} and timePlayed for ${gameUuid}: +${sessionTimeSeconds}s, total: ${newTimePlayed}s`);
        } catch (error) {
          console.error('Error updating game time:', error);
        }

        // Clean up tracking
        activeGameProcesses.delete(processKey);
      }
    });

    gameProcess.on('error', (error) => {
      console.error('Game process error:', error);
      activeGameProcesses.delete(processKey);
    });

    // Notify main window that game was launched
    if (win && !win.isDestroyed()) {
      win.webContents.send('game-launched', {
        gameUuid
      });
    }

    return { success: true, message: 'Game launched successfully', executablePath };
  } catch (error) {
    console.error('Error launching game:', error);
    throw error;
  }
});

// Select image file dialog
ipcMain.handle('select-image-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      {
        name: 'Images or Executable Files',
        extensions: ['jpg', 'jpeg', 'png', 'ico', 'gif', 'bmp', 'webp', 'exe', 'dll', 'lnk']
      },
      {
        name: 'All Files',
        extensions: ['*']
      }
    ]
  });
  return result;
});

// Select executable file dialog
ipcMain.handle('select-executable-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      {
        name: 'Executable Files',
        extensions: ['exe', 'bat', 'cmd', 'msi']
      },
      {
        name: 'All Files',
        extensions: ['*']
      }
    ]
  });
  return result;
});

// Select folder dialog
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  return result;
});

// Open external link in default browser
ipcMain.handle('open-external-link', async (_, url: string) => {
  try {
    // Validate URL format
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL provided')
    }

    // Basic URL validation
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error('URL must start with http:// or https://')
    }

    // Open in external browser
    await shell.openExternal(url)
    console.log('Successfully opened external link:', url)
  } catch (error) {
    console.error('Failed to open external link:', error)
    throw error
  }
});

// Open folder in file explorer
ipcMain.handle('open-folder', async (_, folderPath: string) => {
  try {
    // Validate folder path
    if (!folderPath || typeof folderPath !== 'string') {
      throw new Error('Invalid folder path provided')
    }

    // Check if the path exists
    if (!fs.existsSync(folderPath)) {
      throw new Error('Folder does not exist')
    }

    // Open in file explorer
    await shell.openPath(folderPath)
    console.log('Successfully opened folder:', folderPath)
  } catch (error) {
    console.error('Failed to open folder:', error)
    throw error
  }
});

// Process game image (copy and rename)
ipcMain.handle('process-game-image', async (_, { sourcePath, gameUuid, imageType }) => {
  try {
    console.log('Processing game image:', { sourcePath, gameUuid, imageType });

    // Special case for loading existing images (preview mode)
    if (imageType === 'preview') {
      console.log('Preview mode - checking file existence:', sourcePath);

      // If sourcePath is relative, resolve it relative to appDataPath
      let fullPath = sourcePath;
      if (!path.isAbsolute(sourcePath)) {
        // Convert forward slashes to system-specific path separators before joining
        const normalizedSourcePath = sourcePath.replace(/\//g, path.sep);
        fullPath = path.join(appDataPath, normalizedSourcePath);
        console.log('Resolved relative path to:', fullPath);
      }

      if (fs.existsSync(fullPath)) {
        console.log('File exists, reading file...');
        const fileBuffer = fs.readFileSync(fullPath);
        const base64Data = fileBuffer.toString('base64');
        const fileExtension = path.extname(fullPath);
        const mimeType = getMimeType(fileExtension);
        const previewUrl = `data:${mimeType};base64,${base64Data}`;

        console.log('Preview URL generated successfully, length:', previewUrl.length);
        return {
          success: true,
          previewUrl: previewUrl
        };
      } else {
        console.log('File not found at path:', fullPath);
        return {
          success: false,
          error: 'Image file not found'
        };
      }
    }

    // Normal processing for new images
    // Create temp directory for this game
    const tempDir = path.join(tempPath, 'images', gameUuid);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Get file extension
    const fileExtension = path.extname(sourcePath).toLowerCase();

    // Check if this is an executable file that needs icon extraction
    const executableExtensions = ['.exe', '.dll', '.lnk', '.ico'];      // Also include ICO for extracting 48px icons
    const isExecutableFile = executableExtensions.includes(fileExtension);

    let tempFilePath: string;
    let previewUrl: string;

    if (isExecutableFile && imageType === 'icon') {
      // Extract icon from executable file, ICO file, or shortcut file
      console.log('Extracting icon from file:', sourcePath);

      try {
        // Get file icon using Electron's built-in API with 48px size
        const icon = await app.getFileIcon(sourcePath, { size: 'normal' }); // 'normal' gives 48px

        // Convert to PNG buffer
        const iconBuffer = icon.toPNG();

        // Save icon as PNG file
        const iconFileName = 'icon.png';
        tempFilePath = path.join(tempDir, iconFileName);
        fs.writeFileSync(tempFilePath, iconBuffer);

        // Generate preview URL
        const base64Data = iconBuffer.toString('base64');
        previewUrl = `data:image/png;base64,${base64Data}`;

        console.log('Icon extracted and saved successfully:', tempFilePath);
      } catch (iconError) {
        console.error('Failed to extract icon from file:', iconError);
        return {
          success: false,
          error: 'Failed to extract icon from file'
        };
      }
    } else {
      // Normal image file processing
      // Create new filename
      const newFileName = `${imageType}${fileExtension}`;
      tempFilePath = path.join(tempDir, newFileName);

      // Copy file to temp location
      fs.copyFileSync(sourcePath, tempFilePath);

      // Read file and convert to base64 for preview
      const fileBuffer = fs.readFileSync(tempFilePath);
      const base64Data = fileBuffer.toString('base64');
      const mimeType = getMimeType(fileExtension);
      previewUrl = `data:${mimeType};base64,${base64Data}`;
    }

    return {
      success: true,
      tempPath: tempFilePath,
      previewUrl: previewUrl
    };
  } catch (error) {
    console.error('Error processing image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
});

// Move temp images to library on save
ipcMain.handle('finalize-game-images', async (_, gameUuid) => {
  try {
    const tempDir = path.join(tempPath, 'images', gameUuid);
    const libraryDir = path.join(imgPath_game, gameUuid);

    // Check if temp directory exists
    if (!fs.existsSync(tempDir)) {
      return { success: true, message: 'No temp images to move' };
    }

    // Create library directory if it doesn't exist
    if (!fs.existsSync(libraryDir)) {
      fs.mkdirSync(libraryDir, { recursive: true });
    }

    // Move all files from temp to library
    const tempFiles = fs.readdirSync(tempDir);
    const movedFiles = [];

    for (const fileName of tempFiles) {
      const tempFilePath = path.join(tempDir, fileName);
      const libraryFilePath = path.join(libraryDir, fileName);

      // Move file (copy then delete original)
      fs.copyFileSync(tempFilePath, libraryFilePath);
      fs.unlinkSync(tempFilePath);

      movedFiles.push({
        fileName,
        oldPath: tempFilePath,
        newPath: libraryFilePath
      });
    }

    // Remove temp directory if empty
    try {
      fs.rmdirSync(tempDir);
    } catch (err) {
      // Directory might not be empty or might not exist, ignore error
    }

    return {
      success: true,
      movedFiles,
      message: `Moved ${movedFiles.length} image(s) to library`
    };
  } catch (error) {
    console.error('Error finalizing images:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
});

// Clean up temp images when window is closed without saving
ipcMain.handle('cleanup-temp-images', async (_, gameUuid) => {
  try {
    const tempDir = path.join(tempPath, 'images', gameUuid);

    if (fs.existsSync(tempDir)) {
      // Remove all files in temp directory
      const tempFiles = fs.readdirSync(tempDir);
      for (const fileName of tempFiles) {
        const filePath = path.join(tempDir, fileName);
        fs.unlinkSync(filePath);
      }

      // Remove temp directory
      fs.rmdirSync(tempDir);

      return { success: true, message: 'Temp images cleaned up' };
    }

    return { success: true, message: 'No temp images to clean' };
  } catch (error) {
    console.error('Error cleaning temp images:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
});

// create EditWindow
ipcMain.handle('create-edit-window', (_, gameData) => {
  const editWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 700,
    minHeight: 500,
    parent: win || undefined,
    modal: true,
    titleBarStyle: 'hidden',
    ...(process.platform !== 'darwin' ? {
      titleBarOverlay: {
        color: '#FFF7E6',
        height: 50
      }
    } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  });

  // sent the game data to the edit window
  editWindow.webContents.once('did-finish-load', () => {
    editWindow.webContents.send('load-edit-game-data', gameData);
  });

  if (VITE_DEV_SERVER_URL) {
    editWindow.loadURL(`${VITE_DEV_SERVER_URL}#/edit`);
  } else {
    editWindow.loadFile(path.join(RENDERER_DIST, 'index.html'), {
      hash: '/edit'
    });
  }

  return editWindow.id;
});

// create Add Game Window
ipcMain.handle('create-add-game-window', () => {
  const addGameWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 700,
    minHeight: 500,
    parent: win || undefined,
    modal: true,
    titleBarStyle: 'hidden',
    ...(process.platform !== 'darwin' ? {
      titleBarOverlay: {
        color: '#FFF7E6',
        height: 50
      }
    } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  });

  if (VITE_DEV_SERVER_URL) {
    addGameWindow.loadURL(`${VITE_DEV_SERVER_URL}#/add`);
  } else {
    addGameWindow.loadFile(path.join(RENDERER_DIST, 'index.html'), {
      hash: '/add'
    });
  }

  return addGameWindow.id;
});

function createWindow() {
  win = new BrowserWindow({
    width: 1300,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    // remove the default titlebar
    titleBarStyle: 'hidden',
    // expose window controls in Windows/Linux
    ...(process.platform !== 'darwin' ? {
      titleBarOverlay: {
        color: '#F2F6FC',
        height: 50
      }
    } : {}),
    icon: path.join(process.env.VITE_PUBLIC, 'default', 'favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow);
