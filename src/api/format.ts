import dayjs from 'dayjs'

// Display formatting lives in the renderer; the backend only returns raw ms timestamps.

export function formatTimestamp(timestamp: number | null | undefined): string {
  if (!timestamp) return ''
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss')
}

export function formatDateOnly(timestamp: number | null | undefined): string {
  if (!timestamp) return ''
  return dayjs(timestamp).format('YYYY-MM-DD')
}

// Fill lastPlayedDisplay / releaseDateDisplay on a full game object
export function enrichGameDisplayFields<T extends Partial<gameData>>(game: T): T {
  game.lastPlayedDisplay = formatTimestamp(game.lastPlayed)
  game.releaseDateDisplay = formatDateOnly(game.releaseDate)
  return game
}

// Fill lastPlayedDisplay on a lightweight list item
export function enrichListItemDisplayFields<T extends Partial<GameListItem>>(item: T): T {
  item.lastPlayedDisplay = formatTimestamp(item.lastPlayed)
  return item
}
