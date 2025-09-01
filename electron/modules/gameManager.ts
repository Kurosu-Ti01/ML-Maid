import { ipcMain, BrowserWindow } from 'electron'
import { convertToLocalFileUrl, formatISOToLocal } from '../utils/helpers.js'
import { PROC_MON_MODE } from '../constants/procMonMode.js'
import path from 'node:path'
import fs from 'node:fs'

interface GameData {
  uuid: string
  title: string
  coverImage?: string
  backgroundImage?: string
  iconImage?: string
  lastPlayed?: string
  timePlayed?: number
  workingDir?: string
  folderSize?: number
  genre?: string
  developer?: string
  publisher?: string
  releaseDate?: string
  communityScore?: number
  personalScore?: number
  tags?: string[]
  links?: object
  description?: string[]
  actions?: string[]
  procMonMode?: number  // 0: file, 1: folder, 2: process
  procNames?: string[]  // Process names to monitor when procMonMode=2
}

interface GameModuleConfig {
  metaDb: any
  win: BrowserWindow | null
  appDataPath: string
  tempPath: string
  imgPath_game: string
  isDev: boolean
}

export function setupGameHandlers(config: GameModuleConfig) {
  const { metaDb, win, appDataPath, tempPath, imgPath_game, isDev } = config

  // Get game by ID
  ipcMain.handle('get-game-by-id', (_, gameid: string) => {
    const result = metaDb.prepare('SELECT * FROM games WHERE uuid = ?').get(gameid)

    if (result) {
      // Parse JSON fields back to objects/arrays
      try {
        result.tags = result.tags ? JSON.parse(result.tags) : []
        result.links = result.links ? JSON.parse(result.links) : {}
        result.description = result.description ? JSON.parse(result.description) : []
        result.actions = result.actions ? JSON.parse(result.actions) : []
        result.procNames = result.procNames ? JSON.parse(result.procNames) : []

        // Convert ISO datetime to formatted date string for display
        result.lastPlayedDisplay = formatISOToLocal(result.lastPlayed || '')

        // Convert image paths to custom protocol URLs for production
        result.iconImage = convertToLocalFileUrl(result.iconImage, appDataPath, isDev)
        result.coverImage = convertToLocalFileUrl(result.coverImage, appDataPath, isDev)
        result.backgroundImage = convertToLocalFileUrl(result.backgroundImage, appDataPath, isDev)
      } catch (error) {
        console.error('Error parsing JSON fields for game:', gameid, error)
        // Fallback to default values if parsing fails
        result.tags = []
        result.links = {}
        result.description = []
        result.actions = []
        result.lastPlayedDisplay = ''
      }
    }

    return result
  })

  // Get games list (lightweight - only fields needed for list display)
  ipcMain.handle('get-games-list', () => {
    // Only select the fields needed for list display - much faster!
    const games = metaDb.prepare('SELECT uuid, title, iconImage, genre, lastPlayed FROM games').all()

    // Add formatted display date and convert icon paths for each game
    return games.map((game: any) => ({
      ...game,
      lastPlayedDisplay: formatISOToLocal(game.lastPlayed || ''),
      iconImage: convertToLocalFileUrl(game.iconImage, appDataPath, isDev)
    }))
  })

  // Format ISO datetime for display (utility function for frontend)
  ipcMain.handle('format-datetime', (_, isoDateTime: string) => {
    return formatISOToLocal(isoDateTime)
  })

  // Add a new game
  ipcMain.handle('add-game', async (_, game: GameData) => {
    try {
      // First, finalize images (move from temp to library)
      const imageResult = await finalizeGameImages(game.uuid, tempPath, imgPath_game)

      // Update image paths from temp to library paths (use relative paths)
      const updatedGame = { ...game }
      if (imageResult.success && imageResult.movedFiles) {
        updateGameImagePaths(updatedGame, imageResult.movedFiles, appDataPath)
      }

      const stmt = metaDb.prepare(
        `INSERT INTO games (
        uuid, title, coverImage, backgroundImage, iconImage, lastPlayed, timePlayed,
        workingDir, folderSize, genre, developer, publisher, releaseDate,
        communityScore, personalScore, tags, links, description, actions, procMonMode, procNames
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )

      stmt.run(
        updatedGame.uuid || '',
        updatedGame.title || '',
        updatedGame.coverImage || '',
        updatedGame.backgroundImage || '',
        updatedGame.iconImage || '',
        updatedGame.lastPlayed || '',
        updatedGame.timePlayed || 0,
        updatedGame.workingDir || '',
        updatedGame.folderSize || 0,
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
        (updatedGame.procMonMode === 0 || updatedGame.procMonMode === 1 || updatedGame.procMonMode === 2)
          ? updatedGame.procMonMode
          : PROC_MON_MODE.FOLDER,  // Validate and default to folder mode
        JSON.stringify(updatedGame.procNames || [])  // Store process names as JSON
      )

      // Notify main window to refresh game list
      if (win && !win.isDestroyed()) {
        win.webContents.send('game-list-changed', { action: 'add', game: updatedGame })
      }

      return { success: true }
    } catch (error) {
      console.error('Error adding game:', error)
      throw error
    }
  })

  // Update game data
  ipcMain.handle('update-game', async (_, game: GameData) => {
    try {
      // First, finalize images (move from temp to library)
      const imageResult = await finalizeGameImages(game.uuid, tempPath, imgPath_game)

      // Update image paths from temp to library paths (use relative paths)
      const updatedGame = { ...game }
      if (imageResult.success && imageResult.movedFiles) {
        updateGameImagePaths(updatedGame, imageResult.movedFiles, appDataPath)
      }

      const stmt = metaDb.prepare(
        `UPDATE games SET 
        title = ?, coverImage = ?, backgroundImage = ?, iconImage = ?, lastPlayed = ?,
        timePlayed = ?, workingDir = ?, folderSize = ?, genre = ?, developer = ?,
        publisher = ?, releaseDate = ?, communityScore = ?, personalScore = ?, tags = ?,
        links = ?, description = ?, actions = ?, procMonMode = ?, procNames = ?
      WHERE uuid = ?`
      )

      const result = stmt.run(
        updatedGame.title || '',
        updatedGame.coverImage || '',
        updatedGame.backgroundImage || '',
        updatedGame.iconImage || '',
        updatedGame.lastPlayed || '',
        updatedGame.timePlayed || 0,
        updatedGame.workingDir || '',
        updatedGame.folderSize || 0,
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
        (updatedGame.procMonMode === 0 || updatedGame.procMonMode === 1 || updatedGame.procMonMode === 2)
          ? updatedGame.procMonMode
          : PROC_MON_MODE.FOLDER,  // Validate and default to folder mode
        JSON.stringify(updatedGame.procNames || []),  // Store process names as JSON
        updatedGame.uuid
      )

      // Notify main window to refresh game list and game page
      if (win && !win.isDestroyed()) {
        win.webContents.send('game-list-changed', { action: 'update', game: updatedGame })
      }

      return { success: true, changes: result.changes > 0 }
    } catch (error) {
      console.error('Error updating game:', error)
      throw error
    }
  })

  // Delete game
  ipcMain.handle('delete-game', async (_, uuid: string) => {
    try {
      // First check if the game exists
      const gameData = metaDb.prepare('SELECT * FROM games WHERE uuid = ?').get(uuid)
      if (!gameData) {
        throw new Error(`Game with UUID ${uuid} not found`)
      }

      // Delete the game from database
      const deleteStmt = metaDb.prepare('DELETE FROM games WHERE uuid = ?')
      const result = deleteStmt.run(uuid)

      if (result.changes === 0) {
        throw new Error(`Failed to delete game with UUID ${uuid}`)
      }

      // Delete associated image files
      const gameImageDir = path.join(imgPath_game, uuid)
      if (fs.existsSync(gameImageDir)) {
        try {
          // Remove all files in the game's image directory
          const files = fs.readdirSync(gameImageDir)
          for (const file of files) {
            const filePath = path.join(gameImageDir, file)
            fs.unlinkSync(filePath)
          }
          // Remove the directory itself
          fs.rmdirSync(gameImageDir)
          console.log(`Deleted image directory for game ${uuid}`)
        } catch (imageError) {
          console.warn(`Warning: Failed to delete image directory for game ${uuid}:`, imageError)
          // Don't throw error here, as the database deletion was successful
        }
      }

      // Also clean up any temp images for this game
      const tempImageDir = path.join(tempPath, 'images', uuid)
      if (fs.existsSync(tempImageDir)) {
        try {
          const tempFiles = fs.readdirSync(tempImageDir)
          for (const file of tempFiles) {
            const filePath = path.join(tempImageDir, file)
            fs.unlinkSync(filePath)
          }
          fs.rmdirSync(tempImageDir)
          console.log(`Cleaned up temp images for game ${uuid}`)
        } catch (tempError) {
          console.warn(`Warning: Failed to clean up temp images for game ${uuid}:`, tempError)
        }
      }

      // Notify main window to refresh game list
      if (win && !win.isDestroyed()) {
        win.webContents.send('game-list-changed', { action: 'delete', game: { uuid, title: gameData.title } })
      }

      console.log(`Successfully deleted game: ${gameData.title} (${uuid})`)
      return { success: true, deletedGame: { uuid, title: gameData.title } }
    } catch (error) {
      console.error('Error deleting game:', error)
      throw error
    }
  })
}

// Helper function to finalize game images
async function finalizeGameImages(gameUuid: string, tempPath: string, imgPath_game: string) {
  return new Promise<{ success: boolean, movedFiles?: any[] }>((resolve) => {
    const tempDir = path.join(tempPath, 'images', gameUuid)
    const libraryDir = path.join(imgPath_game, gameUuid)

    if (!fs.existsSync(tempDir)) {
      resolve({ success: true, movedFiles: [] })
      return
    }

    if (!fs.existsSync(libraryDir)) {
      fs.mkdirSync(libraryDir, { recursive: true })
    }

    const tempFiles = fs.readdirSync(tempDir)
    const movedFiles: any[] = []

    for (const fileName of tempFiles) {
      const tempFilePath = path.join(tempDir, fileName)
      const libraryFilePath = path.join(libraryDir, fileName)

      fs.copyFileSync(tempFilePath, libraryFilePath)
      fs.unlinkSync(tempFilePath)

      movedFiles.push({
        fileName,
        oldPath: tempFilePath,
        newPath: libraryFilePath
      })
    }

    try {
      fs.rmdirSync(tempDir)
    } catch (err) {
      // Ignore error
    }

    resolve({ success: true, movedFiles })
  })
}

// Helper function to update game image paths
function updateGameImagePaths(game: GameData, movedFiles: any[], appDataPath: string) {
  movedFiles.forEach((file: any) => {
    const imageType = path.basename(file.fileName, path.extname(file.fileName))
    // Convert absolute path to relative path from appDataPath and normalize separators
    const relativePath = path.relative(appDataPath, file.newPath)
    // Convert Windows backslashes to forward slashes for cross-platform compatibility
    const normalizedPath = relativePath.replace(/\\/g, '/')
    switch (imageType) {
      case 'icon':
        game.iconImage = normalizedPath
        break
      case 'cover':
        game.coverImage = normalizedPath
        break
      case 'background':
        game.backgroundImage = normalizedPath
        break
    }
  })
}
