// Global type definitions for the application

interface Window {
  electronAPI?: {
    // game database operations
    getGameById: (gameid: string) => Promise<any>
    getAllGames: () => Promise<gameData[]>
    addGame: (game: gameData) => Promise<void>
    updateGame: (game: gameData) => Promise<void>
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
  installSize: number;    // Size in bytes
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
