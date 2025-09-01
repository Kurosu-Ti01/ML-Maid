import { app, BrowserWindow, protocol } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Import modules
import { initializeDatabases } from './database/init.js'
import { setupGameHandlers } from './modules/gameManager.js'
import { setupStatsHandlers } from './modules/statsManager.js'
import { setupLauncherHandlers } from './modules/gameLauncher.js'
import { setupFileHandlers } from './modules/fileManager.js'
import { setupWindowHandlers } from './modules/windowManager.js'
import { setupProtocol } from './modules/protocolHandler.js'
import type { AppConfig, DatabaseInstances } from './types/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

// App configuration
const isDev = !app.isPackaged
const appDataPath = isDev
  ? process.env.APP_ROOT  // Development: use project root
  : path.dirname(process.execPath)  // Production: use executable directory

const appConfig: AppConfig = {
  isDev,
  appDataPath,
  libPath: path.join(appDataPath, 'library'),
  tempPath: path.join(appDataPath, 'temp'),
  imgPath_game: path.join(appDataPath, 'library', 'images')
}

// Database instances
let databases: DatabaseInstances

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

function initializeApp() {
  // Initialize databases
  databases = initializeDatabases({
    appDataPath: appConfig.appDataPath,
    libPath: appConfig.libPath,
    tempPath: appConfig.tempPath,
    imgPath_game: appConfig.imgPath_game
  })

  // Setup all handlers
  setupGameHandlers({
    metaDb: databases.metaDb,
    win,
    appDataPath: appConfig.appDataPath,
    tempPath: appConfig.tempPath,
    imgPath_game: appConfig.imgPath_game,
    isDev: appConfig.isDev
  })

  setupStatsHandlers({
    statsDb: databases.statsDb
  })

  setupLauncherHandlers({
    metaDb: databases.metaDb,
    statsDb: databases.statsDb,
    win
  })

  setupFileHandlers({
    tempPath: appConfig.tempPath,
    imgPath_game: appConfig.imgPath_game,
    appDataPath: appConfig.appDataPath
  })

  setupWindowHandlers({
    win,
    VITE_DEV_SERVER_URL,
    RENDERER_DIST,
    preloadPath: path.join(__dirname, 'preload.mjs')
  })
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

// Set protocol privileges before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-file',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true
    }
  }
])

// Register custom protocol for local files
app.whenReady().then(() => {
  setupProtocol()
  createWindow()    // create win first
  initializeApp()   // this require win
})
