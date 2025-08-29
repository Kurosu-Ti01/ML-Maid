import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...
})

// -------- Expose Electron API to Renderer process ---------
contextBridge.exposeInMainWorld('electronAPI', {
  // game database operations
  getGameById: (gameid: string) => ipcRenderer.invoke('get-game-by-id', gameid),
  getGamesList: () => ipcRenderer.invoke('get-games-list'),
  addGame: (game: gameData) => ipcRenderer.invoke('add-game', game),
  updateGame: (game: gameData) => ipcRenderer.invoke('update-game', game),
  deleteGame: (uuid: string) => ipcRenderer.invoke('delete-game', uuid),

  // game actions operations
  launchGame: (params: { gameUuid: string, executablePath?: string }) => ipcRenderer.invoke('launch-game', params),
  selectExecutableFile: () => ipcRenderer.invoke('select-executable-file'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),

  // window operations
  createEditWindow: (gameData: gameData) => ipcRenderer.invoke('create-edit-window', gameData),
  createAddGameWindow: () => ipcRenderer.invoke('create-add-game-window'),

  // image operations
  selectImageFile: () => ipcRenderer.invoke('select-image-file'),
  processGameImage: (params: { sourcePath: string, gameUuid: string, imageType: string }) =>
    ipcRenderer.invoke('process-game-image', params),
  finalizeGameImages: (gameUuid: string) => ipcRenderer.invoke('finalize-game-images', gameUuid),
  cleanupTempImages: (gameUuid: string) => ipcRenderer.invoke('cleanup-temp-images', gameUuid),

  // statistics operations
  getGameRecentDailyStats: (gameUuid: string, days?: number) => ipcRenderer.invoke('get-game-recent-daily-stats', gameUuid, days),
  getGameDailyStatsRange: (gameUuid: string, startDate: string, endDate: string) => ipcRenderer.invoke('get-game-daily-stats-range', gameUuid, startDate, endDate),
  getWeeklyStatsByDate: (dateString: string) => ipcRenderer.invoke('get-weekly-stats-by-date', dateString),
  getOverallStats: () => ipcRenderer.invoke('get-overall-stats'),
  getTopGamesStats: (limit?: number) => ipcRenderer.invoke('get-top-games-stats', limit),
  getMonthlyStats: (year?: number) => ipcRenderer.invoke('get-monthly-stats', year),
  getRecentSessions: (limit?: number) => ipcRenderer.invoke('get-recent-sessions', limit),
  getLaunchMethodStats: (gameUuid?: string) => ipcRenderer.invoke('get-launch-method-stats', gameUuid),

  // external operations

  // open external links and folders
  openExternalLink: (url: string) => ipcRenderer.invoke('open-external-link', url),
  openFolder: (folderPath: string) => ipcRenderer.invoke('open-folder', folderPath),

  // load game data into edit window
  onEditGameData: (callback: (data: gameData) => void) => {
    ipcRenderer.on('load-edit-game-data', (_, data) => callback(data));
  },

  // listen for game list changes
  onGameListChanged: (callback: (data: { action: string, game?: gameData }) => void) => {
    ipcRenderer.on('game-list-changed', (_, data) => callback(data));
  },

  // listen for game launched events
  onGameLaunched: (callback: (data: { gameUuid: string }) => void) => {
    ipcRenderer.on('game-launched', (_, data) => callback(data));
  },

  // listen for game session ended events
  onGameSessionEnded: (callback: (data: {
    gameUuid: string,
    sessionId: number,
    sessionTimeSeconds: number,
    totalTimePlayed: number,
    executablePath: string,
    startTime: string,
    endTime: string
  }) => void) => {
    ipcRenderer.on('game-session-ended', (_, data) => callback(data));
  }
});