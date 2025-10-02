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
    launchGame: (params: {
      gameUuid: string,
      executablePath?: string,
      launchMethodName?: string,
      workingDir?: string,
      procMonMode?: number,
      procNames?: string[]
    }) => Promise<{
      success: boolean;
      message?: string;
      gamePath?: string;
      error?: string;
    }>
    selectExecutableFile: () => Promise<{ canceled: boolean; filePaths: string[] }>
    selectFolder: () => Promise<{ canceled: boolean; filePaths: string[] }>
    // external operations
    openExternalLink: (url: string) => Promise<void>
    openFolder: (folderPath: string) => Promise<void>
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
    // statistics operations
    getGameRecentDailyStats: (gameUuid: string, days?: number) => Promise<{
      sessionDate: string;
      totalSeconds: number;
      sessionCount: number;
    }[]>
    getGameDailyStatsRange: (gameUuid: string, startDate: string, endDate: string) => Promise<{
      sessionDate: string;
      totalSeconds: number;
      sessionCount: number;
    }[]>
    getWeeklyStatsByDate: (dateString: string) => Promise<{
      date: string;
      totalSeconds: number;
      sessionCount: number;
    }[]>
    getDailyGameSessions: (dateString: string) => Promise<{
      uuid: string;
      title: string;
      startTime: string;
      endTime: string;
      durationSeconds: number;
      launchMethod: string;
    }[]>
    getMonthlyDailyStats: (year: number, month: number) => Promise<{
      sessionDate: string;
      totalSeconds: number;
    }[]>
    getYearlyDailyStats: (year?: number) => Promise<{
      sessionDate: string;
      totalSeconds: number;
    }[]>
    getOverallStats: () => Promise<{
      totalPlayTime: number;
      totalSessions: number;
      gamesPlayed: number;
      todayPlayTime: number;
      thisWeekPlayTime: number;
      thisMonthPlayTime: number;
    }>
    getTopGamesStats: (limit?: number) => Promise<{
      uuid: string;
      title: string;
      totalSeconds: number;
      sessionCount: number;
      lastPlayed: string;
    }[]>
    getMonthlyStats: (year?: number) => Promise<{
      sessionMonth: number;
      totalSeconds: number;
      sessionCount: number;
      uniqueGames: number;
    }[]>
    getRecentSessions: (limit?: number) => Promise<{
      id: number;
      uuid: string;
      title: string;
      startTime: string;
      endTime: string;
      durationSeconds: number;
      sessionDate: string;
      launchMethod: string;
    }[]>
    getLaunchMethodStats: (gameUuid?: string) => Promise<{
      launchMethod: string;
      sessionCount: number;
      totalSeconds: number;
      avgSeconds?: number;
      uniqueGames?: number;
      lastUsed: string;
    }[]>
    // event listeners
    onEditGameData: (callback: (data: gameData) => void) => void
    onGameStoreChanged: (callback: (data: { action: string, game?: gameData }) => void) => void
    onGameLaunched: (callback: (data: { gameUuid: string }) => void) => void
    onGameSessionEnded: (callback: (data: {
      gameUuid: string,
      sessionId: number,
      sessionTimeSeconds: number,
      totalTimePlayed: number,
      executablePath: string,
      startTime: string,
      endTime: string
    }) => void) => void
    // settings operations
    getSettings: () => Promise<any>
    saveSettings: (settings: any) => Promise<boolean>
    onSettingsInitial: (callback: (settings: any) => void) => void
  }
}

interface Settings {
  general: {
    theme?: 'light' | 'dark' | 'auto'
    language?: string
    minimizeToTray?: boolean
  }
}

interface gameData {
  uuid: string;
  title: string;
  coverImage: string;
  backgroundImage: string;
  iconImage: string;
  coverImageDisplay?: string;
  backgroundImageDisplay?: string;
  iconImageDisplay?: string;
  lastPlayed: string;     // ISO date format "YYYY-MM-DD HH:MM:SS" (UTC)
  lastPlayedDisplay?: string; // Formatted local time for display
  timePlayed: number;
  workingDir: string;
  folderSize: number;    // Size in bytes
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
  procMonMode: number;    // 0: file, 1: folder, 2: process
  procNames?: string[];   // Process names to monitor when procMonMode=2
}

// For lightweight game list items
interface GameListItem {
  uuid: string
  title: string
  iconImageDisplay: string
  genre: string
  lastPlayed: string
  lastPlayedDisplay?: string // Formatted local time for display
}

// Backend-specific types
interface AppConfig {
  isDev: boolean
  appDataPath: string
  libPath: string
  tempPath: string
  imgPath_game: string
  configPath: string
}

interface DatabaseInstances {
  metaDb: any
  statsDb: any
}