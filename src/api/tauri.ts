// Tauri adapter: implements BackendApi over invoke()/listen().
// Command names mirror the Electron IPC channels in snake_case
// (get-games-list -> get_games_list); backend commands are added phase by
// phase, so calls to not-yet-implemented commands reject gracefully.

import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import type { BackendApi, Unsubscribe } from './index'
import { enrichGameDisplayFields, enrichListItemDisplayFields } from './format'

function subscribe(event: string, callback: (data: any) => void): Unsubscribe {
  const unlisten = listen(event, (e) => callback(e.payload))
  return () => {
    unlisten.then((fn) => fn())
  }
}

export const tauriApi: BackendApi = {
  async getGameById(uuid) {
    const game = await invoke<any>('get_game_by_id', { uuid })
    return game ? enrichGameDisplayFields(game) : null
  },
  async getGamesList() {
    const list = await invoke<GameListItem[]>('get_games_list')
    return list.map(enrichListItemDisplayFields)
  },
  addGame: (game) => invoke('add_game', { game }),
  updateGame: (game) => invoke('update_game', { game }),
  deleteGame: (uuid) => invoke('delete_game', { uuid }),

  launchGame: (params) => invoke('launch_game', { params }),

  selectExecutableFile: () => invoke('select_executable_file'),
  selectFolder: () => invoke('select_folder'),
  selectImageFile: () => invoke('select_image_file'),

  openExternalLink: (url) => invoke('open_external_link', { url }),
  openFolder: (folderPath) => invoke('open_folder', { folderPath }),

  createEditWindow: (game) => invoke('create_edit_window', { game }),
  createAddGameWindow: () => invoke('create_add_game_window'),

  processGameImage: (params) => invoke('process_game_image', { params }),
  finalizeGameImages: (gameUuid) => invoke('finalize_game_images', { gameUuid }),
  cleanupTempImages: (gameUuid) => invoke('cleanup_temp_images', { gameUuid }),

  getGameRecentDailyStats: (gameUuid, days) => invoke('get_game_recent_daily_stats', { gameUuid, days }),
  getGameDailyStatsRange: (gameUuid, startDate, endDate) => invoke('get_game_daily_stats_range', { gameUuid, startDate, endDate }),
  getWeeklyStatsByDate: (dateString) => invoke('get_weekly_stats_by_date', { dateString }),
  getDailyGameSessions: (dateString) => invoke('get_daily_game_sessions', { dateString }),
  getMonthlyDailyStats: (year, month) => invoke('get_monthly_daily_stats', { year, month }),
  getYearlyDailyStats: (year) => invoke('get_yearly_daily_stats', { year }),
  getOverallStats: () => invoke('get_overall_stats'),
  getTopGamesStats: (limit) => invoke('get_top_games_stats', { limit }),
  getMonthlyStats: (year) => invoke('get_monthly_stats', { year }),
  getRecentSessions: (limit) => invoke('get_recent_sessions', { limit }),
  getLaunchMethodStats: (gameUuid) => invoke('get_launch_method_stats', { gameUuid }),

  getSettings: () => invoke('settings_get'),
  saveSettings: (settings) => invoke('settings_save', { settings }),

  getAllGenres: () => invoke('get_all_genres'),
  getAllDevelopers: () => invoke('get_all_developers'),
  getAllPublishers: () => invoke('get_all_publishers'),
  getAllTags: () => invoke('get_all_tags'),

  onEditGameData: (cb) => subscribe('load-edit-game-data', (data) => cb(enrichGameDisplayFields(data))),
  onGameStoreChanged: (cb) => subscribe('game-store-changed', (data) => {
    if (data?.game) enrichGameDisplayFields(data.game)
    cb(data)
  }),
  onGameLaunched: (cb) => subscribe('game-launched', cb),
  onGameSessionEnded: (cb) => subscribe('game-session-ended', cb),
  onGameStopped: (cb) => subscribe('game-stopped', cb)
}
