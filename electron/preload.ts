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
  getGameById: (gameid:string) => ipcRenderer.invoke('get-game-by-id', gameid),
  getAllGames: () => ipcRenderer.invoke('get-all-games'),
  addGame: (game:gameData) => ipcRenderer.invoke('add-game', game),
  updateGame: (game:gameData) => ipcRenderer.invoke('update-game', game),
  
  // window operations
  createEditWindow: (gameData:gameData) => ipcRenderer.invoke('create-edit-window', gameData),
  createAddGameWindow: () => ipcRenderer.invoke('create-add-game-window'),
  
  // image operations
  selectImageFile: () => ipcRenderer.invoke('select-image-file'),
  processGameImage: (params: { sourcePath: string, gameUuid: string, imageType: string }) => 
    ipcRenderer.invoke('process-game-image', params),
  finalizeGameImages: (gameUuid: string) => ipcRenderer.invoke('finalize-game-images', gameUuid),
  cleanupTempImages: (gameUuid: string) => ipcRenderer.invoke('cleanup-temp-images', gameUuid),
  
  // load game data into edit window
  onEditGameData: (callback: (data: gameData) => void) => {
    ipcRenderer.on('load-edit-game-data', (_, data) => callback(data));
  }
});