export interface GameData {
  uuid: string
  title: string
  coverImage?: string
  backgroundImage?: string
  iconImage?: string
  lastPlayed?: string
  timePlayed?: number
  workingDir?: string
  folderSize?: number
  genre?: string
  developer?: string
  publisher?: string
  releaseDate?: string
  communityScore?: number
  personalScore?: number
  tags?: string[]
  links?: object
  description?: string[]
  actions?: string[]
  procMonMode?: number  // 0: file, 1: folder, 2: process
}

export interface AppConfig {
  isDev: boolean
  appDataPath: string
  libPath: string
  tempPath: string
  imgPath_game: string
}

export interface DatabaseInstances {
  metaDb: any
  statsDb: any
}
