// Backend-agnostic API layer.
// Components and stores must import { api } from '@/api' instead of touching
// window.electronAPI directly, so the backend can be swapped (Electron → Tauri)
// by changing only this directory.

import { electronApi } from './electron'
import { tauriApi } from './tauri'

export const isTauri = '__TAURI_INTERNALS__' in window

export type Unsubscribe = () => void

export interface LaunchGameParams {
  gameUuid: string
  executablePath?: string
  launchMethodName?: string
  workingDir?: string
  procMonMode?: number
  procNames?: string[]
}

export interface LaunchGameResult {
  success: boolean
  message?: string
  gamePath?: string
  error?: string
}

export interface FileDialogResult {
  canceled: boolean
  filePaths: string[]
}

export interface ProcessGameImageParams {
  sourcePath: string
  gameUuid: string
  imageType: string
}

export interface ProcessGameImageResult {
  success: boolean
  tempPath?: string
  previewUrl?: string
  error?: string
}

export interface DailyStatsItem {
  sessionDate: string
  totalSeconds: number
  sessionCount: number
}

export interface GameSessionEndedData {
  gameUuid: string
  sessionId: number
  sessionTimeSeconds: number
  totalTimePlayed: number
  executablePath: string
  startTime: number
  endTime: number
}

export interface BackendApi {
  // game database operations
  getGameById(uuid: string): Promise<gameData | null>
  getGamesList(): Promise<GameListItem[]>
  addGame(game: gameData): Promise<void>
  updateGame(game: gameData): Promise<void>
  deleteGame(uuid: string): Promise<void>

  // game launch
  launchGame(params: LaunchGameParams): Promise<LaunchGameResult>

  // dialogs
  selectExecutableFile(): Promise<FileDialogResult>
  selectFolder(): Promise<FileDialogResult>
  selectImageFile(): Promise<FileDialogResult>

  // external
  openExternalLink(url: string): Promise<void>
  openFolder(folderPath: string): Promise<void>

  // images
  processGameImage(params: ProcessGameImageParams): Promise<ProcessGameImageResult>
  finalizeGameImages(gameUuid: string): Promise<{ success: boolean; movedFiles?: any[]; message?: string; error?: string }>
  cleanupTempImages(gameUuid: string): Promise<{ success: boolean; message?: string; error?: string }>

  // statistics
  getGameRecentDailyStats(gameUuid: string, days?: number): Promise<DailyStatsItem[]>
  getGameDailyStatsRange(gameUuid: string, startDate: string, endDate: string): Promise<DailyStatsItem[]>
  getWeeklyStatsByDate(dateString: string): Promise<{ date: string; totalSeconds: number; sessionCount: number }[]>
  getDailyGameSessions(dateString: string): Promise<{
    uuid: string; title: string; startTime: number; endTime: number
    durationSeconds: number; launchMethod: string
  }[]>
  getMonthlyDailyStats(year: number, month: number): Promise<{ sessionDate: string; totalSeconds: number }[]>
  getYearlyDailyStats(year?: number): Promise<{ sessionDate: string; totalSeconds: number }[]>
  getOverallStats(): Promise<{
    totalPlayTime: number; totalSessions: number; gamesPlayed: number
    todayPlayTime: number; thisWeekPlayTime: number; thisMonthPlayTime: number
  }>
  getTopGamesStats(limit?: number): Promise<{
    uuid: string; title: string; totalSeconds: number; sessionCount: number; lastPlayed: string
  }[]>
  getMonthlyStats(year?: number): Promise<{
    sessionMonth: number; totalSeconds: number; sessionCount: number; uniqueGames: number
  }[]>
  getRecentSessions(limit?: number): Promise<{
    id: number; uuid: string; title: string; startTime: number; endTime: number
    durationSeconds: number; sessionDate: string; launchMethod: string
  }[]>
  getLaunchMethodStats(gameUuid?: string): Promise<{
    launchMethod: string; sessionCount: number; totalSeconds: number
    avgSeconds?: number; uniqueGames?: number; lastUsed: string
  }[]>

  // settings
  getSettings(): Promise<Settings>
  saveSettings(settings: Settings): Promise<boolean>

  // metadata
  getAllGenres(): Promise<string[]>
  getAllDevelopers(): Promise<string[]>
  getAllPublishers(): Promise<string[]>
  getAllTags(): Promise<string[]>

  // event subscriptions — all return an unsubscribe function
  onGameStoreChanged(callback: (data: { action: string; game?: gameData }) => void): Unsubscribe
  onGameLaunched(callback: (data: { gameUuid: string }) => void): Unsubscribe
  onGameSessionEnded(callback: (data: GameSessionEndedData) => void): Unsubscribe
  onGameStopped(callback: (data: { gameUuid: string }) => void): Unsubscribe
}

export const api: BackendApi = isTauri ? tauriApi : electronApi

export { formatTimestamp, formatDateOnly } from './format'
