import { app, BrowserWindow } from 'electron'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
import { ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import { v4 as uuidv4 } from 'uuid'
import path from 'node:path'
import fs from 'node:fs'

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
const libPath = path.join(process.env.APP_ROOT, 'library')
if (!fs.existsSync(libPath)) {
  fs.mkdirSync(libPath, { recursive: true })
}
const dbPath_game = path.join(libPath, 'metadata.db');
// const imgPath_game = path.join(libPath, 'images');

const db = new Database(dbPath_game);

// 初始化表
db.prepare(`
  CREATE TABLE IF NOT EXISTS games (
    uuid TEXT PRIMARY KEY,
    title TEXT,
    coverImage TEXT,
    backgroundImage TEXT,
    lastPlayed TEXT,
    timePlayed TEXT,
    installPath TEXT,
    installSize TEXT,
    genre TEXT,
    developer TEXT,
    publisher TEXT,
    releaseDate TEXT,
    tags TEXT,         -- use JSON.stringify to store, use JSON.parse to retrieve
    links TEXT,        -- use JSON.stringify to store, use JSON.parse to retrieve
    description TEXT   -- use JSON.stringify to store, use JSON.parse to retrieve
  )
`).run();

ipcMain.handle('get-game-by-id', (_, gameid) => {
  return db.prepare('SELECT * FROM games WHERE uuid = ?').get(gameid);
});

ipcMain.handle('add-game', (_, game) => {
  const uuid = uuidv4();
  const stmt = db.prepare(
  `INSERT INTO games (
    uuid, title, coverImage, backgroundImage, lastPlayed, timePlayed, installPath, installSize, genre, developer, publisher, releaseDate, tags, links, description
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  stmt.run(
    uuid,
    game.title,
    game.coverImage,
    game.backgroundImage,
    game.lastPlayed,
    game.timePlayed,
    game.installPath,
    game.installSize,
    game.genre,
    game.developer,
    game.publisher,
    game.releaseDate,
    game.tags,        // may use JSON.stringify(game.tags)
    game.links,       // may use JSON.stringify(game.links)
    game.description  // may use JSON.stringify(game.description)
  );
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
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
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

app.whenReady().then(createWindow)
