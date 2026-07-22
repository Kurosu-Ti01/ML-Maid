// Tauri adapter: implements BackendApi over invoke()/listen().
// Command names mirror the Electron IPC channels in snake_case
// (get-games-list -> get_games_list); backend commands are added phase by
// phase, so calls to not-yet-implemented commands reject gracefully.

import { invoke, convertFileSrc } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { openUrl, openPath } from '@tauri-apps/plugin-opener'
import type { BackendApi, Unsubscribe, FileDialogResult, ProcessGameImageResult } from './index'
import { enrichGameDisplayFields, enrichListItemDisplayFields } from './format'

function subscribe(event: string, callback: (data: any) => void): Unsubscribe {
  const unlisten = listen(event, (e) => callback(e.payload))
  return () => {
    unlisten.then((fn) => fn())
  }
}

// Wrap plugin-dialog's open() into the Electron-style { canceled, filePaths } shape
async function pickFile(filters?: { name: string; extensions: string[] }[], directory = false): Promise<FileDialogResult> {
  const selected = await openDialog({ multiple: false, directory, filters })
  if (selected == null) return { canceled: true, filePaths: [] }
  return { canceled: false, filePaths: [selected as string] }
}

// Convert a backend-returned absolute/temp image path into an asset URL the
// webview can load; leave already-usable URLs untouched. The cache-busting
// query is needed because crop/replace reuse the same temp path, and both the
// webview cache and Vue's same-string check would otherwise keep the old image.
function toDisplayUrl(result: ProcessGameImageResult): ProcessGameImageResult {
  if (result.previewUrl && !result.previewUrl.includes('://')) {
    result.previewUrl = `${convertFileSrc(result.previewUrl)}?t=${Date.now()}`
  }
  return result
}

const IMAGE_FILTERS = [
  { name: 'Images / Executables', extensions: ['jpg', 'jpeg', 'png', 'ico', 'gif', 'bmp', 'webp', 'exe', 'dll', 'lnk'] }
]
const EXE_FILTERS = [
  { name: 'Executable Files', extensions: ['exe', 'bat', 'cmd', 'msi'] }
]

// App data path (resolved once) for turning library-relative image paths
// into asset URLs
let appDataPathCache: Promise<string> | null = null
function getAppDataPath(): Promise<string> {
  appDataPathCache ??= invoke<{ appDataPath: string }>('get_app_paths').then(p => p.appDataPath)
  return appDataPathCache
}

function imageDisplayUrl(relPath: string | undefined, appDataPath: string, bust = ''): string {
  if (!relPath) return ''
  if (relPath.includes('://')) return relPath
  const isAbsolute = /^[A-Za-z]:[\\/]/.test(relPath) || relPath.startsWith('/')
  const abs = isAbsolute ? relPath : `${appDataPath}/${relPath}`
  return `${convertFileSrc(abs)}${bust}`
}

async function enrichGameImages<T extends Partial<gameData>>(game: T, bustCache = false): Promise<T> {
  const base = await getAppDataPath()
  // Finalize overwrites library files in place (same path), so a changed game
  // needs fresh URLs or <img> elements keep showing the old bitmap
  const bust = bustCache ? `?t=${Date.now()}` : ''
  game.iconImageDisplay = imageDisplayUrl(game.iconImage, base, bust)
  game.coverImageDisplay = imageDisplayUrl(game.coverImage, base, bust)
  game.backgroundImageDisplay = imageDisplayUrl(game.backgroundImage, base, bust)
  return game
}

export const tauriApi: BackendApi = {
  async getGameById(uuid) {
    const game = await invoke<any>('get_game_by_id', { uuid })
    if (!game) return null
    return enrichGameImages(enrichGameDisplayFields(game))
  },
  async getGamesList() {
    const list = await invoke<any[]>('get_games_list')
    const base = await getAppDataPath()
    return list.map(item => {
      enrichListItemDisplayFields(item)
      item.iconImageDisplay = imageDisplayUrl(item.iconImage, base)
      return item as GameListItem
    })
  },
  addGame: (game) => invoke('add_game', { game }),
  updateGame: (game) => invoke('update_game', { game }),
  deleteGame: (uuid) => invoke('delete_game', { uuid }),

  launchGame: (params) => invoke('launch_game', { params }),
  detectLocaleEmulator: () => invoke('detect_locale_emulator'),

  selectExecutableFile: () => pickFile(EXE_FILTERS),
  selectFolder: () => pickFile(undefined, true),
  selectImageFile: () => pickFile(IMAGE_FILTERS),

  openExternalLink: (url) => openUrl(url),
  openFolder: (folderPath) => openPath(folderPath),

  processGameImage: (params) => invoke<ProcessGameImageResult>('process_game_image', { params }).then(toDisplayUrl),
  cropGameImage: (params) => invoke<ProcessGameImageResult>('crop_game_image', { params }).then(toDisplayUrl),
  finalizeGameImages: (gameUuid) => invoke('finalize_game_images', { gameUuid }),
  cleanupTempImages: (gameUuid) => invoke('cleanup_temp_images', { gameUuid }),

  listPlugins: () => invoke('plugins_list'),
  readPluginEntry: (dirName) => invoke('plugin_read_entry', { dirName }),
  pluginHttpRequest: (params) => invoke('plugin_http_request', { params }),
  downloadGameImage: (params) => invoke<ProcessGameImageResult>('download_game_image', { params }).then(toDisplayUrl),
  getPluginsPath: () => invoke<{ pluginsPath: string }>('get_app_paths').then(p => p.pluginsPath),
  selectPluginArchive: () => pickFile([{ name: 'Plugin Archive', extensions: ['zip'] }]),
  installPluginArchive: (archivePath) => invoke('plugin_install_archive', { archivePath }),
  uninstallPlugin: (dirName) => invoke('plugin_uninstall', { dirName }),

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

  onGameStoreChanged: (cb) => subscribe('game-store-changed', async (data) => {
    if (data?.game) {
      enrichGameDisplayFields(data.game)
      await enrichGameImages(data.game, true)
    }
    cb(data)
  }),
  onGameLaunched: (cb) => subscribe('game-launched', cb),
  onGameSessionEnded: (cb) => subscribe('game-session-ended', cb),
  onGameStopped: (cb) => subscribe('game-stopped', cb)
}
