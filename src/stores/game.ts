import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSettingsStore } from './settings'

export const useGameStore = defineStore('game', () => {
  // State - Only cache lightweight list data and a small amount of full data
  const currentGameUuid = ref<string | null>(null) // Currently selected game UUID
  const gamesList = ref<GameListItem[]>([]) // Lightweight list, used for sidebar, etc.
  const gameDetailsCache = ref<Map<string, gameData>>(new Map()) // Detailed data cache
  const isLoadingList = ref(false)
  const isLoadingDetail = ref<Set<string>>(new Set()) // IDs of games whose details are being loaded
  const error = ref<string | null>(null)
  const listLastUpdated = ref<Date | null>(null)
  const searchQuery = ref<string>('') // Search query for filtering games by title

  // Getters
  const gamesCount = computed(() => gamesList.value.length)

  // Get game details from cache or database
  const getGameById = computed(() => (uuid: string) => {
    return gameDetailsCache.value.get(uuid) || null
  })

  // Lightweight data for list display with filtering and sorting
  const gamesForList = computed(() => {
    const settingsStore = useSettingsStore()
    const sorting = settingsStore.settings.sorting
    const filtering = settingsStore.settings.filtering

    let filteredList = [...gamesList.value]

    // Apply search query filter
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase().trim()
      filteredList = filteredList.filter(game =>
        game.title.toLowerCase().includes(query)
      )
    }

    // Apply filtering if any filters are set
    if (filtering) {
      const hasGenreFilter = filtering.genres && filtering.genres.length > 0
      const hasDeveloperFilter = filtering.developers && filtering.developers.length > 0
      const hasPublisherFilter = filtering.publishers && filtering.publishers.length > 0
      const hasTagsFilter = filtering.tags && filtering.tags.length > 0

      if (hasGenreFilter || hasDeveloperFilter || hasPublisherFilter || hasTagsFilter) {
        filteredList = filteredList.filter(game => {
          let matchesGenre = true
          let matchesDeveloper = true
          let matchesPublisher = true
          let matchesTags = true

          // Genre filter: game.genre is a string array
          if (hasGenreFilter) {
            matchesGenre = filtering.genres!.some(filterGenre =>
              game.genre.some(gameGenre => gameGenre === filterGenre)
            )
          }

          // Developer filter: game.developer is a string array
          if (hasDeveloperFilter) {
            matchesDeveloper = filtering.developers!.some(filterDev =>
              game.developer.some(gameDev => gameDev === filterDev)
            )
          }

          // Publisher filter: game.publisher is a string array
          if (hasPublisherFilter) {
            matchesPublisher = filtering.publishers!.some(filterPub =>
              game.publisher.some(gamePub => gamePub === filterPub)
            )
          }

          // Tags filter: game.tags is a string array
          if (hasTagsFilter) {
            matchesTags = filtering.tags!.some(filterTag =>
              game.tags.some(gameTag => gameTag === filterTag)
            )
          }

          // Game must match ALL active filters (AND logic)
          return matchesGenre && matchesDeveloper && matchesPublisher && matchesTags
        })
      }
    }

    // If no sorting settings, return filtered list
    if (!sorting) {
      return filteredList
    }

    // Sort the filtered list
    filteredList.sort((a, b) => {
      let compareResult = 0

      switch (sorting.sortBy) {
        case 'name':
          compareResult = a.title.localeCompare(b.title)
          break
        case 'dateAdded':
          // Compare dates (ISO format can be compared as strings)
          compareResult = (a.dateAdded || '').localeCompare(b.dateAdded || '')
          break
        case 'lastPlayed':
          // Compare dates (ISO format can be compared as strings)
          compareResult = (a.lastPlayed || '').localeCompare(b.lastPlayed || '')
          break
        case 'score':
          compareResult = (a.personalScore || 0) - (b.personalScore || 0)
          break
        default:
          compareResult = 0
      }

      // Apply sort order
      return sorting.sortOrder === 'ascending' ? compareResult : -compareResult
    })

    return filteredList
  })

  // Actions
  // Load lightweight game list (called at startup)
  async function loadGamesList() {
    if (isLoadingList.value) return

    isLoadingList.value = true
    error.value = null

    try {
      if (window.electronAPI?.getGamesList) {
        gamesList.value = await window.electronAPI.getGamesList()
        listLastUpdated.value = new Date()
        console.log('Games list loaded:', gamesList.value.length, 'games')
      } else {
        throw new Error('electronAPI.getGamesList not available')
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load games list'
      console.error('Error loading games list:', err)
    } finally {
      isLoadingList.value = false
    }
  }


  // Load game details on demand
  async function loadGameDetail(uuid: string): Promise<gameData | null> {
    // If already in cache, return directly
    if (gameDetailsCache.value.has(uuid)) {
      return gameDetailsCache.value.get(uuid)!
    }

    // If currently loading, wait for loading to complete
    if (isLoadingDetail.value.has(uuid)) {
      // Simple polling wait, can use Promise management in real projects
      while (isLoadingDetail.value.has(uuid)) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      return gameDetailsCache.value.get(uuid) || null
    }

    isLoadingDetail.value.add(uuid)

    try {
      if (window.electronAPI?.getGameById) {
        const gameData = await window.electronAPI.getGameById(uuid)
        if (gameData) {
          gameDetailsCache.value.set(uuid, gameData)
          console.log('Game detail loaded:', gameData.title)
          return gameData
        }
      } else {
        throw new Error('electronAPI.getGameById not available')
      }
    } catch (err) {
      console.error('Error loading game detail:', err)
    } finally {
      isLoadingDetail.value.delete(uuid)
    }

    return null
  }

  async function addGame(game: gameData) {
    try {
      if (window.electronAPI?.addGame) {
        // Update database
        await window.electronAPI.addGame(game)

        listLastUpdated.value = new Date()
        console.log('Game added to store:', game.title)
      } else {
        throw new Error('electronAPI.addGame not available')
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to add game'
      console.error('Error adding game:', err)
      throw err
    }
  }

  async function updateGame(updatedGame: gameData) {
    try {
      if (window.electronAPI?.updateGame) {
        // Update database
        await window.electronAPI.updateGame(updatedGame)

        console.log('Game updated in store:', updatedGame.title)
      } else {
        throw new Error('electronAPI.updateGame not available')
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update game'
      console.error('Error updating game:', err)
      throw err
    }
  }

  async function deleteGame(uuid: string) {
    try {
      // Call electron API to delete game from database
      if (window.electronAPI?.deleteGame) {
        await window.electronAPI.deleteGame(uuid)
      } else {
        throw new Error('electronAPI.deleteGame not available')
      }

      // Remove from lightweight list
      const listIndex = gamesList.value.findIndex(game => game.uuid === uuid)
      if (listIndex !== -1) {
        gamesList.value.splice(listIndex, 1)
      }

      // Remove from detailed data cache
      gameDetailsCache.value.delete(uuid)

      listLastUpdated.value = new Date()
      console.log('Game deleted from store:', uuid)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete game'
      console.error('Error deleting game:', err)
      throw err
    }
  }

  function refreshGamesList() {
    return loadGamesList()
  }

  function clearError() {
    error.value = null
  }


  // Clear cache (optional, for memory management)
  function clearDetailsCache() {
    gameDetailsCache.value.clear()
    console.log('Game details cache cleared')
  }

  // Initialize
  async function initialize() {
    if (gamesList.value.length === 0) {
      await loadGamesList()
    }

    // Set up cross-window communication listeners
    setupCrossWindowListeners()
  }

  // Set up cross-window communication listeners
  function setupCrossWindowListeners() {
    if (window.electronAPI?.onGameStoreChanged) {
      console.log('🔧 Setting up cross-window listener')

      window.electronAPI.onGameStoreChanged((data) => {
        console.log('📡 Received game list change notification:', data)
        handleGameStoreChange(data)
      })

      console.log('✅ Cross-window listener setup complete')
    } else {
      console.warn('❌ electronAPI.onGameStoreChanged not available')
    }

    // Set up game launched listener
    if (window.electronAPI?.onGameLaunched) {
      console.log('🔧 Setting up game launched listener')

      window.electronAPI.onGameLaunched((data) => {
        console.log('🎮 Received game launched notification:', data)
        handleGameLaunched(data)
      })

      console.log('✅ Game launched listener setup complete')
    } else {
      console.warn('❌ electronAPI.onGameLaunched not available')
    }

    // Set up game session ended listener
    if (window.electronAPI?.onGameSessionEnded) {
      console.log('🔧 Setting up game session ended listener')

      window.electronAPI.onGameSessionEnded((data) => {
        console.log('🏁 Received game session ended notification:', data)
        handleGameSessionEnded(data)
      })

      console.log('✅ Game session ended listener setup complete')
    } else {
      console.warn('❌ electronAPI.onGameSessionEnded not available')
    }
  }

  // Logic to handle changes in the game store
  function handleGameStoreChange(data: { action: string, game?: gameData }) {
    console.log(`🎮 Processing ${data.action} action for game:`, data.game?.title || 'unknown')

    // —————————————————————
    //   Change Game Cache
    // —————————————————————
    if (data.game) {
      gameDetailsCache.value.set(data.game.uuid, data.game)
      console.log('✅ Updated game to Cache via IPC:', data.game.title)
    }

    // —————————————————————
    //   Change Game List
    // —————————————————————
    if (data.action === 'add' && data.game) {
      // Check if the game already exists to avoid duplicate addition
      const existingIndex = gamesList.value.findIndex(g => g.uuid === data.game!.uuid)
      if (existingIndex === -1) {
        gamesList.value.push({
          uuid: data.game.uuid,
          title: data.game.title,
          iconImageDisplay: data.game.iconImageDisplay!,
          genre: data.game.genre || [],
          developer: data.game.developer || [],
          publisher: data.game.publisher || [],
          tags: data.game.tags || [],
          lastPlayed: data.game.lastPlayed || '',
          dateAdded: data.game.dateAdded,
          personalScore: data.game.personalScore
        })
        console.log('✅ Added game to list via IPC:', data.game.title)
        console.log('📊 New list length:', gamesList.value.length)
      } else {
        console.log('⚠️ Game already exists in list, skipping:', data.game.title)
      }
    } else if (data.action === 'update' && data.game) {
      // Update existing game
      const existingIndex = gamesList.value.findIndex(g => g.uuid === data.game!.uuid)
      if (existingIndex !== -1) {
        gamesList.value[existingIndex] = {
          uuid: data.game.uuid,
          title: data.game.title,
          iconImageDisplay: data.game.iconImageDisplay!,
          genre: data.game.genre || [],
          developer: data.game.developer || [],
          publisher: data.game.publisher || [],
          tags: data.game.tags || [],
          lastPlayed: data.game.lastPlayed || '',
          dateAdded: data.game.dateAdded,
          personalScore: data.game.personalScore
        }
        gameDetailsCache.value.set(data.game.uuid, data.game)
        console.log('✅ Updated game in list via IPC:', data.game.title)
      } else {
        console.log('❌ Game not found for update:', data.game.title)
      }
    } else if (data.action === 'delete' && data.game) {
      // Delete game from list
      const existingIndex = gamesList.value.findIndex(g => g.uuid === data.game!.uuid)
      if (existingIndex !== -1) {
        gamesList.value.splice(existingIndex, 1)
        console.log('✅ Deleted game from list via IPC:', data.game.title)

        // Remove from details cache
        gameDetailsCache.value.delete(data.game.uuid)

        // Clear current selection if deleted game was selected
        if (currentGameUuid.value === data.game.uuid) {
          currentGameUuid.value = null
        }
      } else {
        console.log('❌ Game not found for delete:', data.game.title)
      }
    }
  }

  // Logic to handle game launched events
  function handleGameLaunched(data: { gameUuid: string }) {
    console.log(`🚀 Processing game launched for game:`, data.gameUuid)


  }

  // Logic to handle game session ended events
  function handleGameSessionEnded(data: {
    gameUuid: string,
    sessionId: number,
    sessionTimeSeconds: number,
    totalTimePlayed: number,
    executablePath: string,
    startTime: string,
    endTime: string
  }) {
    console.log(`🏁 Processing game session ended for game:`, data.gameUuid)
    console.log(`⏱️ Session duration: ${data.sessionTimeSeconds}s, Total time: ${data.totalTimePlayed}s`)

    // Update lastPlayed time in games list
    const listIndex = gamesList.value.findIndex(g => g.uuid === data.gameUuid)
    if (listIndex !== -1) {
      gamesList.value[listIndex].lastPlayedDisplay = data.endTime
      console.log('✅ Updated lastPlayed in list:', data.endTime)
    }
    // Update lastPlayed time in details cache if the game is cached
    if (gameDetailsCache.value.has(data.gameUuid)) {
      const cachedGame = gameDetailsCache.value.get(data.gameUuid)!
      cachedGame.lastPlayedDisplay = data.endTime
      gameDetailsCache.value.set(data.gameUuid, cachedGame)
      console.log('✅ Updated lastPlayed in cache:', data.endTime)
    }
    // Update timePlayed in details cache if the game is cached
    if (gameDetailsCache.value.has(data.gameUuid)) {
      const cachedGame = gameDetailsCache.value.get(data.gameUuid)!
      cachedGame.timePlayed = data.totalTimePlayed
      gameDetailsCache.value.set(data.gameUuid, cachedGame)
      console.log('✅ Updated timePlayed in cache:', data.totalTimePlayed)
    }
  }

  // Set search query
  function setSearchQuery(query: string) {
    searchQuery.value = query
  }

  return {
    // State
    currentGameUuid,
    gamesList,
    searchQuery,
    gameDetailsCache,
    isLoadingList,
    isLoadingDetail,
    error,
    listLastUpdated,

    // Getters
    gamesCount,
    getGameById,
    gamesForList,

    // Actions
    loadGamesList,
    loadGameDetail,
    addGame,
    updateGame,
    deleteGame,
    refreshGamesList,
    clearError,
    clearDetailsCache,
    initialize,
    setSearchQuery
  }
})
