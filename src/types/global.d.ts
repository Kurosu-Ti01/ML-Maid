// Global type definitions for the application

// Per-theme glass/ambient overrides; a missing key falls back to the CSS
// default (see APPEARANCE_DEFAULTS in src/composables/useAppearance.ts)
interface AppearanceTheme {
  glassBg?: string        // --glass-bg
  glassStrong?: string    // --glass-strong
  glassBorder?: string    // --glass-border
  glassBlur?: number      // px, backdrop-filter frost (0 = off)
  ambientOpacity?: number // 0..1
  ambientBlur?: number    // px, blur() part of --ambient-filter
  ambientSaturate?: number
  ambientBrightness?: number
}

interface Settings {
  general: {
    theme?: 'light' | 'dark' | 'auto'
    language?: string
    minimizeToTray?: boolean
  }
  sorting?: {
    sortBy: 'name' | 'dateAdded' | 'lastPlayed' | 'score'
    sortOrder: 'ascending' | 'descending'
  }
  filtering?: {
    genres: string[]
    developers: string[]
    publishers: string[]
    tags: string[]
  }
  launcher?: {
    localeEmulatorPath?: string
  }
  appearance?: {
    light?: AppearanceTheme
    dark?: AppearanceTheme
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
  lastPlayed: number | null;     // Unix timestamp in milliseconds, NULL if never played
  lastPlayedDisplay?: string; // Formatted local time for display
  timePlayed: number;
  workingDir: string;
  folderSize: number;    // Size in bytes
  genre: string[];
  developer: string[];
  publisher: string[];
  releaseDate: number | null;    // Unix timestamp in milliseconds, NULL if unknown
  releaseDateDisplay?: string; // Formatted date for display (YYYY-MM-DD)
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
  localeEmulation?: number; // 0: off, 1: Locale Emulator, 2: basic env mode
  dateAdded: number;      // Unix timestamp in milliseconds (when game was added to library)
}

// For lightweight game list items
interface GameListItem {
  uuid: string
  title: string
  iconImageDisplay: string
  genre: string[]
  developer: string[]
  publisher: string[]
  tags: string[]
  lastPlayed: number | null
  lastPlayedDisplay?: string // Formatted local time for display
  dateAdded: number
  personalScore: number
}
