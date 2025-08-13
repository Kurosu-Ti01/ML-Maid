// Global type definitions for the application

interface Window {
  electronAPI?: {
    // game database operations
    getGameById: (gameId: string) => Promise<any>
    getGamesList: () => Promise<GameListItem[]>
    addGame: (game: gameData) => Promise<void>
    updateGame: (game: gameData) => Promise<void>
    deleteGame: (uuid: string) => Promise<void>
    // game actions operations
    launchGame: (params: { gameUuid: string, executablePath?: string }) => Promise<{
      success: boolean;
      message?: string;
      gamePath?: string;
      error?: string;
    }>
    selectExecutableFile: () => Promise<{ canceled: boolean; filePaths: string[] }>
    // external operations
    openExternalLink: (url: string) => Promise<void>
    // window operations
    createEditWindow: (gameData: gameData) => Promise<number>
    createAddGameWindow: () => Promise<number>
    // image operations
    selectImageFile: () => Promise<{ canceled: boolean; filePaths: string[] }>
    processGameImage: (params: {
      sourcePath: string;
      gameUuid: string;
      imageType: string
    }) => Promise<{
      success: boolean;
      tempPath?: string;
      previewUrl?: string;
      error?: string
    }>
    finalizeGameImages: (gameUuid: string) => Promise<{
      success: boolean;
      movedFiles?: any[];
      message?: string;
      error?: string;
    }>
    cleanupTempImages: (gameUuid: string) => Promise<{
      success: boolean;
      message?: string;
      error?: string;
    }>
    // event listeners
    onEditGameData: (callback: (data: gameData) => void) => void
    onGameListChanged: (callback: (data: { action: string, game?: gameData }) => void) => void
    onGameLaunched: (callback: (data: { gameUuid: string, executablePath: string, lastPlayed: string }) => void) => void
    onGameSessionEnded: (callback: (data: { gameUuid: string, sessionTimeSeconds: number, totalTimePlayed: number, executablePath: string }) => void) => void
  }
}

interface gameData {
  uuid: string;
  title: string;
  coverImage: string;
  backgroundImage: string;
  iconImage: string;
  lastPlayed: string;     // ISO date format "YYYY-MM-DD HH:MM:SS"
  timePlayed: number;
  installPath: string;
  installSize: number;    // Size in bytes
  genre: string;
  developer: string;
  publisher: string;
  releaseDate: string;    // ISO date format "YYYY-MM-DD"
  communityScore: number;
  personalScore: number;
  tags: string[];
  links: {
    name: string;
    url: string;
  }[];
  description: string[];
  actions?: {
    name: string;
    type: 'File' | 'Link' | 'Script'; // Action type
    executablePath?: string; // Optional, for actions that require an executable
    parameters?: string;     // Optional, for actions that require parameters
  }[];
}

// For lightweight game list items
interface GameListItem {
  uuid: string
  title: string
  iconImage: string
  genre: string
  lastPlayed: string
}