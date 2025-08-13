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
const imgPath_game = path.join(libPath, 'images');
if (!fs.existsSync(imgPath_game)) {
  fs.mkdirSync(imgPath_game, { recursive: true })
}
const db = new Database(dbPath_game);

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

// Helper function to format date to local timezone YYYY-MM-DD HH:MM:SS format
function formatLocalDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// initialize the database
db.prepare(`
  CREATE TABLE IF NOT EXISTS games (
    uuid TEXT PRIMARY KEY,
    title TEXT,
    coverImage TEXT,
    backgroundImage TEXT,
    iconImage TEXT,
    lastPlayed TEXT,   -- YYYY-MM-DD HH:MM:SS format
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
    } catch (error) {
      console.error('Error parsing JSON fields for game:', gameid, error);
      // Fallback to default values if parsing fails
      result.tags = [];
      result.links = {};
      result.description = [];
      result.actions = [];
    }
  }

  return result;
});

// get games list (lightweight - only fields needed for list display)
ipcMain.handle('get-games-list', () => {
  // Only select the fields needed for list display - much faster!
  return db.prepare('SELECT uuid, title, iconImage, genre, lastPlayed FROM games').all();
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

// Game process tracking
const activeGameProcesses = new Map<string, {
  process: any,
  startTime: Date,
  gameUuid: string,
  executablePath: string
}>();

// Launch game
ipcMain.handle('launch-game', async (_, { gameUuid, executablePath }: { gameUuid: string, executablePath: string }) => {
  try {
    // Check if the path exists
    if (!fs.existsSync(executablePath)) {
      throw new Error(`Game executable not found at: ${executablePath}`);
    }

    console.log(`Launching game: ${executablePath}`);

    // Launch the game using spawn
    const gameProcess = spawn(executablePath, [], {
      detached: false, // we should monitor the process
      stdio: 'ignore',
      cwd: path.dirname(executablePath) // Set working directory to the game's directory
    });

    const startTime = new Date();
    const processKey = `${gameUuid}_${Date.now()}`;

    // Store process info for tracking
    activeGameProcesses.set(processKey, {
      process: gameProcess,
      startTime,
      gameUuid,
      executablePath
    });

    // Monitor process exit
    gameProcess.on('exit', async (code) => {
      const endTime = new Date();
      const processInfo = activeGameProcesses.get(processKey);

      if (processInfo) {
        const sessionTimeSeconds = Math.floor((endTime.getTime() - processInfo.startTime.getTime()) / 1000);
        console.log(`Game ${gameUuid} session ended with code ${code}. Duration: ${sessionTimeSeconds} seconds`);

        try {
          // Get current timePlayed from database
          const currentData = db.prepare('SELECT timePlayed FROM games WHERE uuid = ?').get(gameUuid);
          const currentTimePlayed = currentData ? (currentData.timePlayed || 0) : 0;
          const newTimePlayed = currentTimePlayed + sessionTimeSeconds;

          // Update timePlayed in database
          const updateStmt = db.prepare('UPDATE games SET timePlayed = ? WHERE uuid = ?');
          updateStmt.run(newTimePlayed, gameUuid);

          // Notify main window that game session ended
          if (win && !win.isDestroyed()) {
            win.webContents.send('game-session-ended', {
              gameUuid,
              sessionTimeSeconds,
              totalTimePlayed: newTimePlayed,
              executablePath: processInfo.executablePath
            });
          }

          console.log(`Updated timePlayed for ${gameUuid}: +${sessionTimeSeconds}s, total: ${newTimePlayed}s`);
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

    // Update last played time in database
    const updateStmt = db.prepare('UPDATE games SET lastPlayed = ? WHERE uuid = ?');
    const currentDateTime = formatLocalDateTime(new Date()); // Local timezone YYYY-MM-DD HH:MM:SS format
    updateStmt.run(currentDateTime, gameUuid);

    // Notify main window that game was launched
    if (win && !win.isDestroyed()) {
      win.webContents.send('game-launched', {
        gameUuid,
        executablePath,
        lastPlayed: currentDateTime
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
