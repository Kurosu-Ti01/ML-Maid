import { ipcMain } from 'electron'
import { getWeekNumber } from '../utils/helpers.js'

interface StatsModuleConfig {
  statsDb: any
}

export function setupStatsHandlers(config: StatsModuleConfig) {
  const { statsDb } = config

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
    `
    return statsDb.prepare(query).all(gameUuid)
  })

  // Get game statistics - daily play time for a specific game (date range)
  ipcMain.handle('get-game-daily-stats-range', (_, gameUuid: string, startDate: string, endDate: string) => {
    return getGameDailyStatsByRange(gameUuid, startDate, endDate, statsDb)
  })

  // Get weekly statistics for specified date string
  ipcMain.handle('get-weekly-stats-by-date', (_, dateString: string) => {
    return getWeeklyStatisticsByDate(dateString, statsDb)
  })

  // Get daily game sessions for a specific date (for Profile chart)
  ipcMain.handle('get-daily-game-sessions', (_, dateString: string) => {
    return getDailyGameSessions(dateString, statsDb)
  })

  // Get overall statistics for all games
  ipcMain.handle('get-overall-stats', () => {
    const queries = {
      totalPlayTime: `SELECT SUM(durationSeconds) as total FROM game WHERE isCompleted = 1`,
      totalSessions: `SELECT COUNT(*) as total FROM game WHERE isCompleted = 1`,
      gamesPlayed: `SELECT COUNT(DISTINCT uuid) as total FROM game WHERE isCompleted = 1`,
      todayPlayTime: `SELECT SUM(durationSeconds) as total FROM game WHERE isCompleted = 1 AND sessionDate = date('now', 'localtime')`,
      thisWeekPlayTime: `SELECT SUM(durationSeconds) as total FROM game WHERE isCompleted = 1 AND sessionDate >= date('now', 'weekday 0', '-6 days')`,
      thisMonthPlayTime: `SELECT SUM(durationSeconds) as total FROM game WHERE isCompleted = 1 AND sessionYear = strftime('%Y', 'now') AND sessionMonth = strftime('%m', 'now')`
    }

    const stats: any = {}
    for (const [key, query] of Object.entries(queries)) {
      const result = statsDb.prepare(query).get()
      stats[key] = result ? (result.total || 0) : 0
    }

    return stats
  })

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
    `
    return statsDb.prepare(query).all(limit)
  })

  // Get monthly statistics
  ipcMain.handle('get-monthly-stats', (_, year?: number) => {
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
  })

  // Get daily totals for a specific year and month (for Month tab)
  ipcMain.handle('get-monthly-daily-stats', (_, year: number, month: number) => {
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
  })

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
    `
    return statsDb.prepare(query).all(limit)
  })

  // Get launch method statistics
  ipcMain.handle('get-launch-method-stats', (_, gameUuid?: string) => {
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
  })
}

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
function getWeeklyStatisticsByDate(dateString: string, statsDb: any) {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const weekNumber = getWeekNumber(date)

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
  `
  return statsDb.prepare(query).all(year, weekNumber)
}

// Internal function to get daily game sessions for Profile chart
function getDailyGameSessions(dateString: string, statsDb: any) {
  const query = `
    SELECT 
      uuid,
      title,
      startTime,
      endTime,
      durationSeconds,
      launchMethod
    FROM game 
    WHERE isCompleted = 1 
    AND sessionDate = ?
    ORDER BY startTime ASC
  `
  return statsDb.prepare(query).all(dateString)
}
