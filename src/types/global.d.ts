// Global type definitions for the application

interface Window {
  electronAPI?: {
    // game database operations
    getGameById: (gameid: string) => Promise<any>
    addGame: (game: gameData) => Promise<void>
    updateGame: (game: gameData) => Promise<void>
    // window operations
    createEditWindow: (gameData: gameData) => Promise<number>
    // event listeners
    onEditGameData: (callback: (data: gameData) => void) => void
  }
}

interface gameData {
  uuid: string;
  title: string;
  coverImage: string;
  backgroundImage: string;
  iconImage: string;
	lastPlayed: string;     // ISO date format "YYYY-MM-DD"
  timePlayed: number;
  installPath: string;
  installSize: number;
  genre: string;
  developer: string;
  publisher: string;
  releaseDate: string;    // ISO date format "YYYY-MM-DD"
  communityScore: number;
  personalScore: number;
  tags: string[];
  links: {
    '批評空間'?: string;
    'VNDB'?: string;
    'Bangumi'?: string;
    'WikiPedia'?: string;
    'WikiData'?: string;
  };
  description: string[];
}
