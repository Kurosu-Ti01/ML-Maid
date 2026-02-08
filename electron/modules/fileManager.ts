import { ipcMain, dialog, shell, app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { getMimeType } from '../utils/helpers.js'
import { t as et } from '../utils/i18n.js'

interface FileModuleConfig {
  tempPath: string
  imgPath_game: string
  appDataPath: string
}

export function setupFileHandlers(config: FileModuleConfig) {
  const { tempPath, imgPath_game, appDataPath } = config

  // Select image file dialog
  ipcMain.handle('select-image-file', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        {
          name: et('electron.dialog.imagesOrExecutables'),
          extensions: ['jpg', 'jpeg', 'png', 'ico', 'gif', 'bmp', 'webp', 'exe', 'dll', 'lnk']
        },
        {
          name: et('electron.dialog.allFiles'),
          extensions: ['*']
        }
      ]
    })
    return result
  })

  // Select executable file dialog
  ipcMain.handle('select-executable-file', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        {
          name: et('electron.dialog.executableFiles'),
          extensions: ['exe', 'bat', 'cmd', 'msi']
        },
        {
          name: et('electron.dialog.allFiles'),
          extensions: ['*']
        }
      ]
    })
    return result
  })

  // Select folder dialog
  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    return result
  })

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
  })

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
  })

  // Process game image (copy and rename)
  ipcMain.handle('process-game-image', async (_, { sourcePath, gameUuid, imageType }) => {
    try {
      console.log('Processing game image:', { sourcePath, gameUuid, imageType })

      // Special case for loading existing images (preview mode)
      if (imageType === 'preview') {
        console.log('Preview mode - checking file existence:', sourcePath)

        // If sourcePath is relative, resolve it relative to appDataPath
        let fullPath = sourcePath
        if (!path.isAbsolute(sourcePath)) {
          // Convert forward slashes to system-specific path separators before joining
          const normalizedSourcePath = sourcePath.replace(/\//g, path.sep)
          fullPath = path.join(appDataPath, normalizedSourcePath)
          console.log('Resolved relative path to:', fullPath)
        }

        if (fs.existsSync(fullPath)) {
          console.log('File exists, reading file...')
          const fileBuffer = fs.readFileSync(fullPath)
          const base64Data = fileBuffer.toString('base64')
          const fileExtension = path.extname(fullPath)
          const mimeType = getMimeType(fileExtension)
          const previewUrl = `data:${mimeType};base64,${base64Data}`

          console.log('Preview URL generated successfully, length:', previewUrl.length)
          return {
            success: true,
            previewUrl: previewUrl
          }
        } else {
          console.log('File not found at path:', fullPath)
          return {
            success: false,
            error: 'Image file not found'
          }
        }
      }

      // Normal processing for new images
      // Create temp directory for this game
      const tempDir = path.join(tempPath, 'images', gameUuid)
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }

      // Get file extension
      const fileExtension = path.extname(sourcePath).toLowerCase()

      // Check if this is an executable file that needs icon extraction
      const executableExtensions = ['.exe', '.dll', '.lnk', '.ico']      // Also include ICO for extracting 48px icons
      const isExecutableFile = executableExtensions.includes(fileExtension)

      let tempFilePath: string
      let previewUrl: string

      if (isExecutableFile && imageType === 'icon') {
        // Extract icon from executable file, ICO file, or shortcut file
        console.log('Extracting icon from file:', sourcePath)

        try {
          // Get file icon using Electron's built-in API with 48px size
          const icon = await app.getFileIcon(sourcePath, { size: 'normal' }) // 'normal' gives 48px

          // Convert to PNG buffer
          const iconBuffer = icon.toPNG()

          // Save icon as PNG file
          const iconFileName = 'icon.png'
          tempFilePath = path.join(tempDir, iconFileName)
          fs.writeFileSync(tempFilePath, iconBuffer)

          // Generate preview URL
          const base64Data = iconBuffer.toString('base64')
          previewUrl = `data:image/png;base64,${base64Data}`

          console.log('Icon extracted and saved successfully:', tempFilePath)
        } catch (iconError) {
          console.error('Failed to extract icon from file:', iconError)
          return {
            success: false,
            error: 'Failed to extract icon from file'
          }
        }
      } else {
        // Normal image file processing
        // Create new filename
        const newFileName = `${imageType}${fileExtension}`
        tempFilePath = path.join(tempDir, newFileName)

        // Copy file to temp location
        fs.copyFileSync(sourcePath, tempFilePath)

        // Read file and convert to base64 for preview
        const fileBuffer = fs.readFileSync(tempFilePath)
        const base64Data = fileBuffer.toString('base64')
        const mimeType = getMimeType(fileExtension)
        previewUrl = `data:${mimeType};base64,${base64Data}`
      }

      return {
        success: true,
        tempPath: tempFilePath,
        previewUrl: previewUrl
      }
    } catch (error) {
      console.error('Error processing image:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  })

  // Move temp images to library on save
  ipcMain.handle('finalize-game-images', async (_, gameUuid) => {
    try {
      const tempDir = path.join(tempPath, 'images', gameUuid)
      const libraryDir = path.join(imgPath_game, gameUuid)

      // Check if temp directory exists
      if (!fs.existsSync(tempDir)) {
        return { success: true, message: 'No temp images to move' }
      }

      // Create library directory if it doesn't exist
      if (!fs.existsSync(libraryDir)) {
        fs.mkdirSync(libraryDir, { recursive: true })
      }

      // Move all files from temp to library
      const tempFiles = fs.readdirSync(tempDir)
      const movedFiles = []

      for (const fileName of tempFiles) {
        const tempFilePath = path.join(tempDir, fileName)
        const libraryFilePath = path.join(libraryDir, fileName)

        // Move file (copy then delete original)
        fs.copyFileSync(tempFilePath, libraryFilePath)
        fs.unlinkSync(tempFilePath)

        movedFiles.push({
          fileName,
          oldPath: tempFilePath,
          newPath: libraryFilePath
        })
      }

      // Remove temp directory if empty
      try {
        fs.rmdirSync(tempDir)
      } catch (err) {
        // Directory might not be empty or might not exist, ignore error
      }

      return {
        success: true,
        movedFiles,
        message: `Moved ${movedFiles.length} image(s) to library`
      }
    } catch (error) {
      console.error('Error finalizing images:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  })

  // Clean up temp images when window is closed without saving
  ipcMain.handle('cleanup-temp-images', async (_, gameUuid) => {
    try {
      const tempDir = path.join(tempPath, 'images', gameUuid)

      if (fs.existsSync(tempDir)) {
        // Remove all files in temp directory
        const tempFiles = fs.readdirSync(tempDir)
        for (const fileName of tempFiles) {
          const filePath = path.join(tempDir, fileName)
          fs.unlinkSync(filePath)
        }

        // Remove temp directory
        fs.rmdirSync(tempDir)

        return { success: true, message: 'Temp images cleaned up' }
      }

      return { success: true, message: 'No temp images to clean' }
    } catch (error) {
      console.error('Error cleaning temp images:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  })
}
