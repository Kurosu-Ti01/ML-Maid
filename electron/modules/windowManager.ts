import { ipcMain, BrowserWindow } from 'electron'
import path from 'node:path'

interface WindowModuleConfig {
  win: BrowserWindow | null
  VITE_DEV_SERVER_URL?: string
  RENDERER_DIST: string
  preloadPath: string
}

export function setupWindowHandlers(config: WindowModuleConfig) {
  const { win, VITE_DEV_SERVER_URL, RENDERER_DIST, preloadPath } = config

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
        preload: preloadPath,
      },
    })

    // sent the game data to the edit window
    editWindow.webContents.once('did-finish-load', () => {
      editWindow.webContents.send('load-edit-game-data', gameData)
    })

    if (VITE_DEV_SERVER_URL) {
      editWindow.loadURL(`${VITE_DEV_SERVER_URL}#/edit`)
    } else {
      editWindow.loadFile(path.join(RENDERER_DIST, 'index.html'), {
        hash: '/edit'
      })
    }

    return editWindow.id
  })

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
        preload: preloadPath,
      },
    })

    if (VITE_DEV_SERVER_URL) {
      addGameWindow.loadURL(`${VITE_DEV_SERVER_URL}#/add`)
    } else {
      addGameWindow.loadFile(path.join(RENDERER_DIST, 'index.html'), {
        hash: '/add'
      })
    }

    return addGameWindow.id
  })
}
