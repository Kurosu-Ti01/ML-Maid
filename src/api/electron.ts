// Electron adapter: implements BackendApi over the preload bridge.
// Talks to IPC channels directly via window.ipcRenderer so event listeners
// can be unsubscribed (the legacy window.electronAPI.onX wrappers cannot).

import type { BackendApi, Unsubscribe } from './index'
import { enrichGameDisplayFields, enrichListItemDisplayFields } from './format'

function invoke<T = any>(channel: string, ...args: any[]): Promise<T> {
  if (!window.ipcRenderer) {
    return Promise.reject(new Error(`IPC bridge not available (channel: ${channel})`))
  }
  return window.ipcRenderer.invoke(channel, ...args)
}

function subscribe(channel: string, callback: (data: any) => void): Unsubscribe {
  if (!window.ipcBridge) {
    console.warn(`IPC bridge not available, cannot subscribe to ${channel}`)
    return () => { }
  }
  const id = window.ipcBridge.subscribe(channel, callback)
  return () => window.ipcBridge.unsubscribe(id)
}

export const electronApi: BackendApi = {
  async getGameById(uuid) {
    const game = await invoke('get-game-by-id', uuid)
    return game ? enrichGameDisplayFields(game) : null
  },
  async getGamesList() {
    const list = await invoke<GameListItem[]>('get-games-list')
    return list.map(enrichListItemDisplayFields)
  },
  addGame: (game) => invoke('add-game', JSON.parse(JSON.stringify(game))),
  updateGame: (game) => invoke('update-game', JSON.parse(JSON.stringify(game))),
  deleteGame: (uuid) => invoke('delete-game', uuid),

  launchGame: (params) => invoke('launch-game', params),
  // Not available on the Electron backend
  detectLocaleEmulator: () => Promise.resolve(null),

  selectExecutableFile: () => invoke('select-executable-file'),
  selectFolder: () => invoke('select-folder'),
  selectImageFile: () => invoke('select-image-file'),

  openExternalLink: (url) => invoke('open-external-link', url),
  openFolder: (folderPath) => invoke('open-folder', folderPath),

  processGameImage: (params) => invoke('process-game-image', params),
  finalizeGameImages: (gameUuid) => invoke('finalize-game-images', gameUuid),
  cleanupTempImages: (gameUuid) => invoke('cleanup-temp-images', gameUuid),

  getGameRecentDailyStats: (gameUuid, days) => invoke('get-game-recent-daily-stats', gameUuid, days),
  getGameDailyStatsRange: (gameUuid, startDate, endDate) => invoke('get-game-daily-stats-range', gameUuid, startDate, endDate),
  getWeeklyStatsByDate: (dateString) => invoke('get-weekly-stats-by-date', dateString),
  getDailyGameSessions: (dateString) => invoke('get-daily-game-sessions', dateString),
  getMonthlyDailyStats: (year, month) => invoke('get-monthly-daily-stats', year, month),
  getYearlyDailyStats: (year) => invoke('get-yearly-daily-stats', year),
  getOverallStats: () => invoke('get-overall-stats'),
  getTopGamesStats: (limit) => invoke('get-top-games-stats', limit),
  getMonthlyStats: (year) => invoke('get-monthly-stats', year),
  getRecentSessions: (limit) => invoke('get-recent-sessions', limit),
  getLaunchMethodStats: (gameUuid) => invoke('get-launch-method-stats', gameUuid),

  getSettings: () => invoke('settings-get'),
  saveSettings: (settings) => invoke('settings-save', JSON.parse(JSON.stringify(settings))),

  getAllGenres: () => invoke('get-all-genres'),
  getAllDevelopers: () => invoke('get-all-developers'),
  getAllPublishers: () => invoke('get-all-publishers'),
  getAllTags: () => invoke('get-all-tags'),

  onGameStoreChanged: (cb) => subscribe('game-store-changed', (data) => {
    if (data?.game) enrichGameDisplayFields(data.game)
    cb(data)
  }),
  onGameLaunched: (cb) => subscribe('game-launched', cb),
  onGameSessionEnded: (cb) => subscribe('game-session-ended', cb),
  onGameStopped: (cb) => subscribe('game-stopped', cb)
}
