import fs from 'node:fs'
import path from 'node:path'
import ini from 'ini'
import { ipcMain, BrowserWindow } from 'electron'

export interface Settings {
  general: {
    theme?: string
    language?: string
  }
}

const defaultSettings: Settings = {
  general: {
    theme: 'light',
    language: 'en-US',
  },
}

export function getSettings(configDir: string): Settings {
  const configFile = path.join(configDir, 'settings.conf')
  let settings: Settings = { ...defaultSettings }
  if (!fs.existsSync(configFile)) {
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true })
    }
    fs.writeFileSync(configFile, ini.stringify(defaultSettings), 'utf-8')
  } else {
    const iniContent = fs.readFileSync(configFile, 'utf-8')
    settings = { ...defaultSettings, ...ini.parse(iniContent) }
  }
  return settings
}

export function saveSettings(configDir: string, settings: Settings) {
  const configFile = path.join(configDir, 'settings.conf')
  fs.writeFileSync(configFile, ini.stringify(settings), 'utf-8')
}

export function setupSettingsHandlers(configDir: string) {
  // Read settings
  ipcMain.handle('settings-get', () => {
    return getSettings(configDir)
  })

  // Save settings
  ipcMain.handle('settings-save', (_, settings: Settings) => {
    saveSettings(configDir, settings)
    return true
  })
}

// Send current settings to renderer
export function sendSettingsToRenderer(win: BrowserWindow, configDir: string) {
  const settings = getSettings(configDir)
  win.webContents.send('settings-initial', settings)
}
