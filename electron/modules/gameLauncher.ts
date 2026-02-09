import { ipcMain, BrowserWindow } from 'electron'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { getWeekNumber } from '../utils/helpers.js'
import { PROC_MON_MODE, type ProcMonMode } from '../constants/procMonMode.js'
import { handleProcessExit, activeGameProcesses } from './processMonitor.js'

interface LauncherModuleConfig {
  metaDb: any
  statsDb: any
  win: BrowserWindow | null
}

interface GameLaunchParams {
  gameUuid: string
  executablePath: string
  launchMethodName: string
  workingDir: string
  procMonMode: ProcMonMode
  procNames?: string[]
}

export function setupLauncherHandlers(config: LauncherModuleConfig) {
  const { metaDb, statsDb, win } = config

  // Launch game with enhanced monitoring
  ipcMain.handle('launch-game', async (_, params: GameLaunchParams) => {
    const {
      gameUuid,
      executablePath,
      launchMethodName,
      workingDir = path.dirname(executablePath),
      procMonMode = PROC_MON_MODE.FOLDER,
      procNames = []
    } = params

    try {
      // Check if the path exists
      if (!fs.existsSync(executablePath)) {
        throw new Error(`Game executable not found at: ${executablePath}`)
      }

      console.log(`Launching game: ${executablePath}`)
      console.log(`Working directory: ${workingDir}`)
      console.log(`Process monitor mode: ${procMonMode}`)
      console.log(`Process names: ${procNames}`)

      // Get game name for statistics
      const gameData = metaDb.prepare('SELECT title FROM games WHERE uuid = ?').get(gameUuid)
      const gameName = gameData ? gameData.title : 'Unknown Game'

      // Use provided launch method name
      if (!launchMethodName) {
        throw new Error('Launch method name is required')
      }

      console.log(`Launch method: ${launchMethodName}`)

      // Launch the game using spawn
      const gameProcess = spawn(executablePath, [], {
        detached: false,
        stdio: 'ignore',
        cwd: workingDir
      })

      const startTime = new Date()
      const processKey = `${gameUuid}_${Date.now()}`
      const startTimeTs = startTime.getTime() // Unix timestamp in milliseconds

      // For statistics, use local date for date/time components
      const year = startTime.getFullYear()
      const month = String(startTime.getMonth() + 1).padStart(2, '0')
      const day = String(startTime.getDate()).padStart(2, '0')
      const sessionDate = `${year}-${month}-${day}`

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
        gameUuid, gameName, startTimeTs, launchMethodName, executablePath, sessionDate,
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
        workingDir,
        sessionId,
        procMonMode,
        procNames,
        monitoredProcesses: new Set(),
        isLauncherOnly: false
      })

      // Monitor process exit
      gameProcess.on('exit', async (code) => {
        await handleProcessExit(processKey, code, config)
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
