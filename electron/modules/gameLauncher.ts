import { ipcMain, BrowserWindow } from 'electron'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { formatDateToISO, formatISOToLocal, getWeekNumber } from '../utils/helpers.js'

interface LauncherModuleConfig {
  metaDb: any
  statsDb: any
  win: BrowserWindow | null
}

// Game process tracking
const activeGameProcesses = new Map<string, {
  process: any
  startTime: Date
  gameUuid: string
  executablePath: string
  sessionId: number  // Add session ID for tracking
}>()

export function setupLauncherHandlers(config: LauncherModuleConfig) {
  const { metaDb, statsDb, win } = config

  // Launch game
  ipcMain.handle('launch-game', async (_, { gameUuid, executablePath, launchMethodName }: { gameUuid: string, executablePath: string, launchMethodName: string }) => {
    try {
      // Check if the path exists
      if (!fs.existsSync(executablePath)) {
        throw new Error(`Game executable not found at: ${executablePath}`)
      }

      console.log(`Launching game: ${executablePath}`)

      // Get game name for statistics
      const gameData = metaDb.prepare('SELECT title FROM games WHERE uuid = ?').get(gameUuid)
      const gameName = gameData ? gameData.title : 'Unknown Game'

      // Use provided launch method name (should always be provided since name is required)
      if (!launchMethodName) {
        throw new Error('Launch method name is required')
      }

      console.log(`Launch method: ${launchMethodName}`)

      // Launch the game using spawn
      const gameProcess = spawn(executablePath, [], {
        detached: false, // we should monitor the process
        stdio: 'ignore',
        cwd: path.dirname(executablePath) // Set working directory to the game's directory
      })

      const startTime = new Date()
      const processKey = `${gameUuid}_${Date.now()}`
      const startTimeStr = formatDateToISO(startTime) // Store UTC time in database

      // For statistics, use local date for date/time components
      const year = startTime.getFullYear()
      const month = String(startTime.getMonth() + 1).padStart(2, '0')
      const day = String(startTime.getDate()).padStart(2, '0')
      const sessionDate = `${year}-${month}-${day}` // Local date in YYYY-MM-DD format

      // Extract date components for statistics (based on local time)
      const sessionYear = startTime.getFullYear()
      const sessionMonth = startTime.getMonth() + 1 // JavaScript months are 0-based
      const sessionWeek = getWeekNumber(startTime)
      const sessionDayOfWeek = startTime.getDay() // 0=Sunday, 6=Saturday

      // Create session record in statistics database
      const sessionStmt = statsDb.prepare(`
        INSERT INTO game (
          uuid, title, startTime, launchMethod, executablePath, sessionDate, 
          sessionYear, sessionMonth, sessionWeek, sessionDayOfWeek
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      const sessionResult = sessionStmt.run(
        gameUuid, gameName, startTimeStr, launchMethodName, executablePath, sessionDate,
        sessionYear, sessionMonth, sessionWeek, sessionDayOfWeek
      )
      const sessionId = sessionResult.lastInsertRowid as number

      console.log(`Created game session ${sessionId} for game ${gameUuid} (${gameName})`)

      // Store process info for tracking
      activeGameProcesses.set(processKey, {
        process: gameProcess,
        startTime,
        gameUuid,
        executablePath,
        sessionId
      })

      // Monitor process exit
      gameProcess.on('exit', async (code) => {
        const endTime = new Date()
        const processInfo = activeGameProcesses.get(processKey)

        if (processInfo) {
          const sessionTimeSeconds = Math.floor((endTime.getTime() - processInfo.startTime.getTime()) / 1000)
          const endTimeStr = formatDateToISO(endTime)

          console.log(`Game ${gameUuid} session ${processInfo.sessionId} ended with code ${code}. Duration: ${sessionTimeSeconds} seconds`)

          try {
            // Update session record in statistics database
            const updateSessionStmt = statsDb.prepare(`
              UPDATE game 
              SET endTime = ?, durationSeconds = ?, exitCode = ?, isCompleted = 1
              WHERE id = ?
            `)
            updateSessionStmt.run(endTimeStr, sessionTimeSeconds, code, processInfo.sessionId)

            // Get current timePlayed from database
            const currentData = metaDb.prepare('SELECT timePlayed FROM games WHERE uuid = ?').get(gameUuid)
            const currentTimePlayed = currentData ? (currentData.timePlayed || 0) : 0
            const newTimePlayed = currentTimePlayed + sessionTimeSeconds

            // Update timePlayed and lastPlayed in database
            const updateStmt = metaDb.prepare('UPDATE games SET timePlayed = ?, lastPlayed = ? WHERE uuid = ?')
            updateStmt.run(newTimePlayed, endTimeStr, gameUuid)

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
              })
            }

            console.log(`Updated session ${processInfo.sessionId} and timePlayed for ${gameUuid}: +${sessionTimeSeconds}s, total: ${newTimePlayed}s`)
          } catch (error) {
            console.error('Error updating game time:', error)
          }

          // Clean up tracking
          activeGameProcesses.delete(processKey)
        }
      })

      gameProcess.on('error', (error) => {
        console.error('Game process error:', error)
        activeGameProcesses.delete(processKey)
      })

      // Notify main window that game was launched
      if (win && !win.isDestroyed()) {
        win.webContents.send('game-launched', {
          gameUuid
        })
      }

      return { success: true, message: 'Game launched successfully', executablePath }
    } catch (error) {
      console.error('Error launching game:', error)
      throw error
    }
  })
}

export { activeGameProcesses }
