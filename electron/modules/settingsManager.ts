import fs from 'node:fs'
import path from 'node:path'
import ini from 'ini'
import { ipcMain, BrowserWindow } from 'electron'
import { updateTitleBarColor } from '../main.js'

const defaultSettings: Settings = {
  general: {
    theme: 'auto',
    language: 'en-US',
    minimizeToTray: true,
  },
  sorting: {
    sortBy: 'name',
    sortOrder: 'ascending',
  },
}

// Global settings object - directly accessible from main process
export let settings: Settings = { ...defaultSettings }
let configDirectory: string | null = null

// Initialize settings from file
export function initializeSettings(configDir: string): void {
  configDirectory = configDir
  const configFile = path.join(configDir, 'settings.conf')

  if (!fs.existsSync(configFile)) {
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true })
    }
    fs.writeFileSync(configFile, ini.stringify(defaultSettings), 'utf-8')
    // settings already has default values
  } else {
    const iniContent = fs.readFileSync(configFile, 'utf-8')
    const loadedSettings = ini.parse(iniContent)
    // Merge loaded settings with defaults
    settings = { ...defaultSettings, ...loadedSettings }
  }
}

// Save settings to file
export function saveSettings(newSettings: Settings): void {
  if (!configDirectory) {
    throw new Error('Settings not initialized. Call initializeSettings first.')
  }

  // Update global settings object
  settings = { ...newSettings }

  // Write to file
  const configFile = path.join(configDirectory, 'settings.conf')
  fs.writeFileSync(configFile, ini.stringify(settings), 'utf-8')
}

export function setupSettingsHandlers(configDir: string) {
  // Initialize settings on first setup
  initializeSettings(configDir)

  // Read settings
  ipcMain.handle('settings-get', () => {
    return settings
  })

  // Save settings
  ipcMain.handle('settings-save', (_, newSettings: Settings) => {
    const oldTheme = settings.general?.theme
    saveSettings(newSettings)

    // Update title bar color if theme changed
    if (oldTheme !== newSettings.general?.theme) {
      updateTitleBarColor()
    }

    return true
  })
}

// Send current settings to renderer
export function sendSettingsToRenderer(win: BrowserWindow): void {
  win.webContents.send('settings-initial', settings)
}
