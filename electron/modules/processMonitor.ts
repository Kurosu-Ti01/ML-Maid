import { BrowserWindow } from 'electron'
import {
  getAllProcessesWithPaths,
  checkRunningProcesses as psCheckRunningProcesses,
  findProcessesByNames as psFindProcessesByNames
} from '../utils/powershell.js'
import { PROC_MON_MODE, type ProcMonMode } from '../constants/procMonMode.js'

interface ProcessMonitorConfig {
  metaDb: any
  statsDb: any
  win: BrowserWindow | null
}

interface GameProcessInfo {
  process: any
  startTime: Date
  gameUuid: string
  executablePath: string
  workingDir: string
  sessionId: number
  procMonMode: ProcMonMode
  procNames: string[]
  monitoredProcesses: Set<number>
  isLauncherOnly: boolean
}

// Enhanced game process tracking
const activeGameProcesses = new Map<string, GameProcessInfo>()

// Handle process exit and start appropriate monitoring
export async function handleProcessExit(
  processKey: string,
  exitCode: number | null,
  config: ProcessMonitorConfig
): Promise<void> {
  const processInfo = activeGameProcesses.get(processKey)
  if (!processInfo) return

  const endTime = new Date()
  const initialSessionTime = Math.floor((endTime.getTime() - processInfo.startTime.getTime()) / 1000)

  console.log(`Initial process exited after ${initialSessionTime} seconds, mode: ${processInfo.procMonMode}`)

  // If the process ran for more than 10 seconds, consider it a valid game session
  if (initialSessionTime >= 10) {
    console.log('Process ran long enough to be considered a game session')
    await finalizeGameSession(processKey, initialSessionTime, exitCode || 0, endTime, config)
    return
  }

  // Process ended quickly, likely a launcher - start monitoring based on mode
  console.log('Process ended quickly, likely a launcher. Starting monitoring...')
  processInfo.isLauncherOnly = true

  // Wait a moment for the real game processes to start
  const monitorDelay = 5000 // 5 seconds - increased for slower game startups
  console.log(`Waiting ${monitorDelay / 1000} seconds for game processes to start...`)
  setTimeout(async () => {
    await startProcessMonitoring(processKey, config)
  }, monitorDelay)
}

// Start monitoring based on the specified mode
async function startProcessMonitoring(processKey: string, config: ProcessMonitorConfig): Promise<void> {
  const processInfo = activeGameProcesses.get(processKey)
  if (!processInfo) return

  console.log(`Starting process monitoring with mode: ${processInfo.procMonMode}`)

  let gameProcesses: number[] = []

  switch (processInfo.procMonMode) {
    case PROC_MON_MODE.FILE:
      // FILE mode: Only monitor the original executable process (but it already ended)
      console.log('FILE mode: Original process already ended, no additional monitoring')
      await finalizeGameSession(processKey, 0, 0, new Date(), config, true)
      return

    case PROC_MON_MODE.FOLDER:
      // FOLDER mode: Monitor all executables in the working directory
      gameProcesses = await findProcessesInFolder(processInfo.workingDir)
      break

    case PROC_MON_MODE.PROCESS:
      // PROCESS mode: Monitor specific process names
      gameProcesses = await findProcessesByNames(processInfo.procNames)
      break

    default:
      console.error(`Unknown process monitoring mode: ${processInfo.procMonMode}`)
      await finalizeGameSession(processKey, 0, 0, new Date(), config, true)
      return
  }

  if (gameProcesses.length > 0) {
    console.log(`Found ${gameProcesses.length} game processes to monitor:`, gameProcesses)
    gameProcesses.forEach(pid => processInfo.monitoredProcesses.add(pid))
    startContinuousMonitoring(processKey, config)
  } else {
    console.log('No game processes found, ending session')
    await finalizeGameSession(processKey, 0, 0, new Date(), config, true)
  }
}

// Find processes running executables in the specified folder
async function findProcessesInFolder(folderPath: string): Promise<number[]> {
  try {
    console.log(`Searching for processes in folder: ${folderPath}`)

    // Use PowerShell to get all processes with their paths
    const processes = await getAllProcessesWithPaths()
    const gameProcesses: number[] = []

    for (const process of processes) {
      // Check if the process path starts with our target folder
      if (process.path.toLowerCase().startsWith(folderPath.toLowerCase())) {
        // Check if it's an actual executable file
        if (process.path.toLowerCase().endsWith('.exe')) {
          gameProcesses.push(process.pid)
          console.log(`✓ Added to monitoring: ${process.path} (PID: ${process.pid})`)
        }
      }
    }

    console.log(`Total .exe processes found for monitoring: ${gameProcesses.length}`)
    return gameProcesses

  } catch (error) {
    console.error('Error finding processes in folder:', error)
    return []
  }
}

// Find processes by specific names
async function findProcessesByNames(processNames: string[]): Promise<number[]> {
  if (processNames.length === 0) {
    return []
  }

  try {
    // Use PowerShell to find processes by names
    const processes = await psFindProcessesByNames(processNames)
    const gameProcesses: number[] = []

    for (const process of processes) {
      gameProcesses.push(process.pid)
      console.log(`Found target process: ${process.name} (PID: ${process.pid})`)
    }

    return gameProcesses
  } catch (error) {
    console.error('Error finding processes by names:', error)
    return []
  }
}

// Continuously monitor the tracked game processes
function startContinuousMonitoring(processKey: string, config: ProcessMonitorConfig): void {
  const processInfo = activeGameProcesses.get(processKey)
  if (!processInfo) return

  console.log(`Starting continuous monitoring for ${processInfo.monitoredProcesses.size} processes`)

  let lastProcessCount = processInfo.monitoredProcesses.size

  const checkInterval = setInterval(async () => {
    try {
      // Check which processes are still running
      const stillRunning = await checkRunningProcesses(Array.from(processInfo.monitoredProcesses))

      // Update the monitored processes set
      processInfo.monitoredProcesses.clear()
      stillRunning.forEach(pid => processInfo.monitoredProcesses.add(pid))

      // Only log when process count changes
      if (stillRunning.length !== lastProcessCount) {
        console.log(`Process check: ${stillRunning.length} processes still running`)
        lastProcessCount = stillRunning.length
      }

      if (stillRunning.length === 0) {
        // All game processes have ended
        clearInterval(checkInterval)
        const endTime = new Date()
        const totalSessionTime = Math.floor((endTime.getTime() - processInfo.startTime.getTime()) / 1000)

        console.log(`All game processes ended. Total session time: ${totalSessionTime} seconds`)
        await finalizeGameSession(processKey, totalSessionTime, 0, endTime, config)
      }
    } catch (error) {
      console.error('Error in continuous monitoring:', error)
      clearInterval(checkInterval)
    }
  }, 3000) // Check every 3 seconds

  // Timeout after 12 hours
  setTimeout(() => {
    clearInterval(checkInterval)
    console.log('Game monitoring timeout reached (12 hours)')
  }, 12 * 60 * 60 * 1000)
}

// Check which processes from the list are still running
async function checkRunningProcesses(processIds: number[]): Promise<number[]> {
  if (processIds.length === 0) return []

  try {
    // Use PowerShell to check running processes
    const runningPids = await psCheckRunningProcesses(processIds)
    return runningPids
  } catch (error) {
    console.error('Error checking running processes:', error)
    return []
  }
}

// Finalize game session and update database
async function finalizeGameSession(
  processKey: string,
  sessionTimeSeconds: number,
  exitCode: number,
  endTime: Date,
  config: ProcessMonitorConfig,
  isLauncherOnly: boolean = false
): Promise<void> {
  const processInfo = activeGameProcesses.get(processKey)
  if (!processInfo) return

  const { metaDb, statsDb, win } = config
  const endTimeTs = endTime.getTime() // Unix timestamp in milliseconds
  const { gameUuid, sessionId } = processInfo

  try {
    if (isLauncherOnly || sessionTimeSeconds < 10) {
      // Mark as launcher session (not completed) - don't add to play time
      const updateSessionStmt = statsDb.prepare(`
        UPDATE game 
        SET endTime = ?, durationSeconds = ?, exitCode = ?, isCompleted = 0
        WHERE id = ?
      `)
      updateSessionStmt.run(endTimeTs, sessionTimeSeconds, exitCode, sessionId)

      console.log(`Session ${sessionId} marked as launcher (${sessionTimeSeconds}s), not adding to play time`)
    } else {
      // Valid game session
      const updateSessionStmt = statsDb.prepare(`
        UPDATE game 
        SET endTime = ?, durationSeconds = ?, exitCode = ?, isCompleted = 1
        WHERE id = ?
      `)
      updateSessionStmt.run(endTimeTs, sessionTimeSeconds, exitCode, sessionId)

      // Get current timePlayed from database
      const currentData = metaDb.prepare('SELECT timePlayed FROM games WHERE uuid = ?').get(gameUuid)
      const currentTimePlayed = currentData ? (currentData.timePlayed || 0) : 0
      const newTimePlayed = currentTimePlayed + sessionTimeSeconds

      // Update timePlayed and lastPlayed in database (lastPlayed as timestamp)
      const updateStmt = metaDb.prepare('UPDATE games SET timePlayed = ?, lastPlayed = ? WHERE uuid = ?')
      updateStmt.run(newTimePlayed, endTimeTs, gameUuid)

      // Notify main window that game session ended
      if (win && !win.isDestroyed()) {
        win.webContents.send('game-session-ended', {
          gameUuid,
          sessionId,
          sessionTimeSeconds,
          totalTimePlayed: newTimePlayed,
          executablePath: processInfo.executablePath,
          startTime: processInfo.startTime.getTime(),
          endTime: endTimeTs
        })
      }

      console.log(`Updated session ${sessionId} and timePlayed for ${gameUuid}: +${sessionTimeSeconds}s, total: ${newTimePlayed}s`)
    }
  } catch (error) {
    console.error('Error finalizing game session:', error)
  }

  // Clean up tracking
  activeGameProcesses.delete(processKey)
}

// Export functions and types for use in gameLauncher
export { activeGameProcesses }
export type { GameProcessInfo, ProcessMonitorConfig }
