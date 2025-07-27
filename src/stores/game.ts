import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Lightweight game list item, only contains fields needed for list display
interface GameListItem {
  uuid: string
  title: string
  iconImage: string
  genre: string
  lastPlayed: string
}

export const useGameStore = defineStore('game', () => {
  // State - Only cache lightweight list data and a small amount of full data
  const gamesList = ref<GameListItem[]>([]) // Lightweight list, used for sidebar, etc.
  const gameDetailsCache = ref<Map<string, gameData>>(new Map()) // Detailed data cache
  const isLoadingList = ref(false)
  const isLoadingDetail = ref<Set<string>>(new Set()) // IDs of games whose details are being loaded
  const error = ref<string | null>(null)
  const listLastUpdated = ref<Date | null>(null)

  // Getters
  const gamesCount = computed(() => gamesList.value.length)
  
  // Get game details from cache or database
  const getGameById = computed(() => (uuid: string) => {
    return gameDetailsCache.value.get(uuid) || null
  })

  const gamesByGenre = computed(() => (genre: string) => {
    return gamesList.value.filter(game => game.genre === genre)
  })

  // Lightweight data for list display
  const gamesForList = computed(() => gamesList.value)

  // Actions
  // Load lightweight game list (called at startup)
  async function loadGamesList() {
    if (isLoadingList.value) return

    isLoadingList.value = true
    error.value = null

    try {
      if (window.electronAPI?.getGamesList) {
        // 使用新的轻量级 API，只查询需要的字段
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
        await window.electronAPI.addGame(game)
        
        // Update lightweight list
        gamesList.value.push({
          uuid: game.uuid,
          title: game.title,
          iconImage: game.iconImage,
          genre: game.genre,
          lastPlayed: game.lastPlayed
        })
        
        // Add detailed data to cache
        gameDetailsCache.value.set(game.uuid, game)
        
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
        await window.electronAPI.updateGame(updatedGame)
        
        // Update lightweight list
        const listIndex = gamesList.value.findIndex(game => game.uuid === updatedGame.uuid)
        if (listIndex !== -1) {
          gamesList.value[listIndex] = {
            uuid: updatedGame.uuid,
            title: updatedGame.title,
            iconImage: updatedGame.iconImage,
            genre: updatedGame.genre,
            lastPlayed: updatedGame.lastPlayed
          }
        }
        
        // Update detailed data cache
        gameDetailsCache.value.set(updatedGame.uuid, updatedGame)
        
        listLastUpdated.value = new Date()
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

  // Initialize (only load list)
  async function initialize() {
    if (gamesList.value.length === 0) {
      await loadGamesList()
    }
  }

  return {
    // State
    gamesList,
    gameDetailsCache,
    isLoadingList,
    isLoadingDetail,
    error,
    listLastUpdated,
    
    // Getters
    gamesCount,
    getGameById,
    gamesByGenre,
    gamesForList,
    
    // Actions
    loadGamesList,
    loadGameDetail,
    addGame,
    updateGame,
    refreshGamesList,
    clearError,
    clearDetailsCache,
    initialize
  }
})
