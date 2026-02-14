import { ipcMain } from 'electron'
import { getWeekNumber } from '../utils/helpers.js'

// Helper to get local YYYY-MM-DD string for "today"
function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Helper to get local date N days ago as YYYY-MM-DD
function getLocalDateNDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return getLocalDateString(d)
}

// Helper to get start of current week (Monday) as YYYY-MM-DD
function getStartOfWeek(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  d.setDate(diff)
  return getLocalDateString(d)
}

interface StatsModuleConfig {
  statsDb: any
  metaDb: any
}

export function setupStatsHandlers(config: StatsModuleConfig) {
  const { statsDb, metaDb } = config

  // ────────────────────────────
  //   Overall Tab IPC Handlers
  // ────────────────────────────
  // Get game statistics - daily play time for a specific game (recent days)
  ipcMain.handle('get-game-recent-daily-stats', (_, gameUuid: string, days: number = 30) => {
    return getGameRecentDailyStats(gameUuid, days, statsDb)
  })

  // Get overall statistics for all games
  ipcMain.handle('get-overall-stats', () => {
    return getOverallStats(statsDb)
  })

  // ────────────────────────────
  //    Day Tab IPC Handlers
  // ────────────────────────────
  // Get daily game sessions for a specific date
  ipcMain.handle('get-daily-game-sessions', (_, dateString: string) => {
    return getDailyGameSessions(dateString, statsDb, metaDb)
  })

  // ────────────────────────────
  //    Week Tab IPC Handlers
  // ────────────────────────────
  // Get weekly statistics for specified date string
  ipcMain.handle('get-weekly-stats-by-date', (_, dateString: string) => {
    return getWeeklyStatisticsByDate(dateString, statsDb, metaDb)
  })

  // ────────────────────────────
  //    Month Tab IPC Handlers
  // ────────────────────────────
  // Get daily totals for a specific year and month (for Month tab)
  ipcMain.handle('get-monthly-daily-stats', (_, year: number, month: number) => {
    return getMonthlyDailyStats(year, month, statsDb)
  })

  // ────────────────────────────
  //    Year Tab IPC Handlers
  // ────────────────────────────
  // Get daily totals for a full year (for Year tab)
  ipcMain.handle('get-yearly-daily-stats', (_, year?: number) => {
    return getYearlyDailyStats(year, statsDb)
  })

  // ────────────────────────────
  //   Unused IPC Handlers
  // ────────────────────────────
  // Get monthly statistics
  ipcMain.handle('get-monthly-stats', (_, year?: number) => {
    return getMonthlyStats(year, statsDb)
  })

  // Get game statistics - daily play time for a specific game (date range)
  ipcMain.handle('get-game-daily-stats-range', (_, gameUuid: string, startDate: string, endDate: string) => {
    return getGameDailyStatsByRange(gameUuid, startDate, endDate, statsDb)
  })

  // Get top played games
  ipcMain.handle('get-top-games-stats', (_, limit: number = 10) => {
    return getTopGamesStats(limit, statsDb, metaDb)
  })

  // Get recent game sessions (updated to include launch method)
  ipcMain.handle('get-recent-sessions', (_, limit: number = 20) => {
    return getRecentSessions(limit, statsDb, metaDb)
  })

  // Get launch method statistics
  ipcMain.handle('get-launch-method-stats', (_, gameUuid?: string) => {
    return getLaunchMethodStats(gameUuid, statsDb)
  })
}

// ────────────────────────────
//   IPC Handlers Functions
// ────────────────────────────
// Internal function to get game daily statistics by date range
function getGameDailyStatsByRange(gameUuid: string, startDate: string, endDate: string, statsDb: any) {
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
  `
  return statsDb.prepare(query).all(gameUuid, startDate, endDate)
}

// Internal function to get weekly statistics by date string
function getWeeklyStatisticsByDate(dateString: string, statsDb: any, metaDb: any) {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const weekNumber = getWeekNumber(date)

  const query = `
    SELECT 
      sessionDate,
      sessionDayOfWeek,
      uuid,
      SUM(durationSeconds) as totalSeconds,
      COUNT(*) as sessionCount
    FROM game 
    WHERE isCompleted = 1 
    AND sessionYear = ? 
    AND sessionWeek = ?
    GROUP BY sessionDate, sessionDayOfWeek, uuid
    ORDER BY sessionDayOfWeek ASC, uuid ASC
  `
  const rows = statsDb.prepare(query).all(year, weekNumber)

  // Look up titles from metadata.db
  const getTitle = metaDb.prepare('SELECT title FROM games WHERE uuid = ?')
  return rows.map((row: any) => {
    const gameData = getTitle.get(row.uuid)
    return { ...row, title: gameData?.title || 'Unknown Game' }
  })
}

// Internal function to get daily game sessions for Profile chart
function getDailyGameSessions(dateString: string, statsDb: any, metaDb: any) {
  const query = `
    SELECT 
      uuid,
      startTime,
      endTime,
      durationSeconds,
      launchMethod
    FROM game 
    WHERE isCompleted = 1 
    AND sessionDate = ?
    ORDER BY startTime ASC
  `
  const rows = statsDb.prepare(query).all(dateString)

  // Look up titles from metadata.db
  const getTitle = metaDb.prepare('SELECT title FROM games WHERE uuid = ?')
  return rows.map((row: any) => {
    const gameData = getTitle.get(row.uuid)
    return { ...row, title: gameData?.title || 'Unknown Game' }
  })
}

// Internal function to get overall statistics
function getOverallStats(statsDb: any) {
  const today = getLocalDateString()
  const weekStart = getStartOfWeek()
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const queries = {
    totalPlayTime: `SELECT SUM(durationSeconds) as total FROM game WHERE isCompleted = 1`,
    totalSessions: `SELECT COUNT(*) as total FROM game WHERE isCompleted = 1`,
    gamesPlayed: `SELECT COUNT(DISTINCT uuid) as total FROM game WHERE isCompleted = 1`,
    todayPlayTime: `SELECT SUM(durationSeconds) as total FROM game WHERE isCompleted = 1 AND sessionDate = ?`,
    thisWeekPlayTime: `SELECT SUM(durationSeconds) as total FROM game WHERE isCompleted = 1 AND sessionDate >= ?`,
    thisMonthPlayTime: `SELECT SUM(durationSeconds) as total FROM game WHERE isCompleted = 1 AND sessionYear = ? AND sessionMonth = ?`
  }

  const stats: any = {}

  // Queries without parameters
  for (const key of ['totalPlayTime', 'totalSessions', 'gamesPlayed'] as const) {
    const result = statsDb.prepare(queries[key]).get()
    stats[key] = result ? (result.total || 0) : 0
  }

  // Today
  const todayResult = statsDb.prepare(queries.todayPlayTime).get(today)
  stats.todayPlayTime = todayResult ? (todayResult.total || 0) : 0

  // This week
  const weekResult = statsDb.prepare(queries.thisWeekPlayTime).get(weekStart)
  stats.thisWeekPlayTime = weekResult ? (weekResult.total || 0) : 0

  // This month
  const monthResult = statsDb.prepare(queries.thisMonthPlayTime).get(currentYear, currentMonth)
  stats.thisMonthPlayTime = monthResult ? (monthResult.total || 0) : 0

  return stats
}

// Internal function to get top played games statistics
function getTopGamesStats(limit: number, statsDb: any, metaDb: any) {
  const query = `
    SELECT 
      uuid,
      SUM(durationSeconds) as totalSeconds,
      COUNT(*) as sessionCount,
      MAX(sessionDate) as lastPlayed
    FROM game 
    WHERE isCompleted = 1
    GROUP BY uuid
    ORDER BY totalSeconds DESC
    LIMIT ?
  `
  const rows = statsDb.prepare(query).all(limit)

  // Look up titles from metadata.db
  const getTitle = metaDb.prepare('SELECT title FROM games WHERE uuid = ?')
  return rows.map((row: any) => {
    const gameData = getTitle.get(row.uuid)
    return { ...row, title: gameData?.title || 'Unknown Game' }
  })
}

// Internal function to get monthly statistics
function getMonthlyStats(year: number | undefined, statsDb: any) {
  const targetYear = year || new Date().getFullYear()
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
  `
  return statsDb.prepare(query).all(targetYear)
}

// Internal function to get daily totals for a specific year and month
function getMonthlyDailyStats(year: number, month: number, statsDb: any) {
  // sessionMonth in the DB is stored as zero-padded string (e.g. '01'..'12')
  const yearStr = year.toString()
  const monthStr = month.toString().padStart(2, '0')
  const query = `
    SELECT
      sessionDate,
      SUM(durationSeconds) as totalSeconds
    FROM game
    WHERE isCompleted = 1
      AND sessionYear = ?
      AND sessionMonth = ?
    GROUP BY sessionDate
    ORDER BY sessionDate ASC
  `
  return statsDb.prepare(query).all(yearStr, monthStr)
}

// New: Internal function to get daily totals for a full year
function getYearlyDailyStats(year: number | undefined, statsDb: any) {
  const targetYear = (year || new Date().getFullYear()).toString()
  const query = `
    SELECT
      sessionDate,
      SUM(durationSeconds) as totalSeconds
    FROM game
    WHERE isCompleted = 1
      AND sessionYear = ?
    GROUP BY sessionDate
    ORDER BY sessionDate ASC
  `
  return statsDb.prepare(query).all(targetYear)
}

// Internal function to get recent game sessions
function getRecentSessions(limit: number, statsDb: any, metaDb: any) {
  const query = `
    SELECT 
      id,
      uuid,
      startTime,
      endTime,
      durationSeconds,
      sessionDate,
      launchMethod
    FROM game 
    WHERE isCompleted = 1
    ORDER BY startTime DESC
    LIMIT ?
  `
  const rows = statsDb.prepare(query).all(limit)

  // Look up titles from metadata.db
  const getTitle = metaDb.prepare('SELECT title FROM games WHERE uuid = ?')
  return rows.map((row: any) => {
    const gameData = getTitle.get(row.uuid)
    return { ...row, title: gameData?.title || 'Unknown Game' }
  })
}

// Internal function to get launch method statistics
function getLaunchMethodStats(gameUuid: string | undefined, statsDb: any) {
  let query
  let params: any[] = []

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
    `
    params = [gameUuid]
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
    `
  }

  return statsDb.prepare(query).all(...params)
}

// Internal function to get game statistics - daily play time for a specific game (recent days)
function getGameRecentDailyStats(gameUuid: string, days: number, statsDb: any) {
  const startDate = getLocalDateNDaysAgo(days)
  const query = `
    SELECT 
      sessionDate,
      SUM(durationSeconds) as totalSeconds,
      COUNT(*) as sessionCount
    FROM game 
    WHERE uuid = ? AND isCompleted = 1
    AND sessionDate >= ?
    GROUP BY sessionDate
    ORDER BY sessionDate DESC
  `
  return statsDb.prepare(query).all(gameUuid, startDate)
}
