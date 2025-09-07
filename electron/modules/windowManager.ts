import { ipcMain, BrowserWindow, nativeTheme } from 'electron'
import path from 'node:path'
import { settings } from './settingsManager'

interface WindowModuleConfig {
  win: BrowserWindow | null
  VITE_DEV_SERVER_URL?: string
  RENDERER_DIST: string
  preloadPath: string
}

// Get current theme configuration for new windows
function getCurrentThemeConfig() {
  const theme = settings.general?.theme || 'auto'
  let isDark = false

  if (theme === 'dark') {
    isDark = true
  } else if (theme === 'light') {
    isDark = false
  } else { // auto
    isDark = nativeTheme.shouldUseDarkColors
  }

  return {
    titleBarOverlay: {
      color: isDark ? '#333333' : '#FFF7E6',
      symbolColor: isDark ? '#ffffff' : '#000000',
      height: 50
    },
    isDark
  }
}

export function setupWindowHandlers(config: WindowModuleConfig) {
  const { win, VITE_DEV_SERVER_URL, RENDERER_DIST, preloadPath } = config

  // create EditWindow
  ipcMain.handle('create-edit-window', (_, gameData) => {
    const themeConfig = getCurrentThemeConfig()

    const editWindow = new BrowserWindow({
      width: 900,
      height: 700,
      minWidth: 700,
      minHeight: 500,
      parent: win || undefined,
      modal: true,
      titleBarStyle: 'hidden',
      show: false,
      ...(process.platform !== 'darwin' ? {
        titleBarOverlay: themeConfig.titleBarOverlay
      } : {}),
      webPreferences: {
        preload: preloadPath,
      },
    })

    // sent the game data and theme to the edit window
    editWindow.webContents.once('did-finish-load', () => {
      editWindow.webContents.send('load-edit-game-data', gameData)
      editWindow.webContents.send('settings-initial', settings)
      editWindow.show()
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
    const themeConfig = getCurrentThemeConfig()

    const addGameWindow = new BrowserWindow({
      width: 900,
      height: 700,
      minWidth: 700,
      minHeight: 500,
      parent: win || undefined,
      modal: true,
      titleBarStyle: 'hidden',
      show: false,
      ...(process.platform !== 'darwin' ? {
        titleBarOverlay: themeConfig.titleBarOverlay
      } : {}),
      webPreferences: {
        preload: preloadPath,
      },
    })

    // Send theme settings to the add game window
    addGameWindow.webContents.once('did-finish-load', () => {
      addGameWindow.webContents.send('settings-initial', settings)
      addGameWindow.show()
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
