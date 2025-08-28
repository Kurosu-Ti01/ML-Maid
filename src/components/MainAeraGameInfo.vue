<template>
  <el-scrollbar>
    <div v-if="isLoading" class="loading-container" v-loading="true" element-loading-text="Loading game data...">
      <!-- Loading content will be handled by v-loading directive -->
    </div>
    <div v-else-if="(!gameStore.currentGameUuid) || (!gameData)" class="no-game-container">
      <div class="no-game-text">
        <p>No game selected</p>
        <span class="no-game-hint">Please select a game from the sidebar</span>
      </div>
    </div>
    <div v-else>
      <!-- Background & Title Container-->
      <div class="background-title-container">
        <div v-if="gameData.backgroundImage">
          <img :src="gameData.backgroundImage" alt="Game Background" class="game-background" />
        </div>
        <div v-else>
          <img src="/default/ML-Maid-Background.png" alt="Default Background" class="game-background" />
        </div>
        <!-- Icon & Title Container -->
        <div class="icon-title-container">
          <div v-if="gameData.iconImage" class="game-icon-container">
            <img :src="gameData.iconImage" alt="Game Icon" class="game-icon" />
          </div>
          <div v-else class="game-icon-container">
            <img src="/default/ML-Maid-Icon-W.png" alt="Default Icon" class="game-icon" />
          </div>
          <span class="game-title">{{ gameData.title }}</span>
        </div>
      </div>
      <!-- Main Info & Actions Container  -->
      <div class="main-info-action-container">
        <!-- Action Button Container -->
        <div class="action-button-container">
          <div class="button-group">
            <el-button type="primary" size="large"
              style="font-weight: bold; font-size: 1.2em; margin: 10px 5px; padding: 0 40px;"
              @click="handlePlayGame">Play</el-button>
            <el-button type="primary" size="large" style="font-weight: bold; font-size: 1.2em; margin: 10px 5px;"
              @click="openEditWindow">Edit</el-button>
            <el-dropdown trigger="click" @command="handleMenuCommand">
              <el-button type="primary" size="large" style="font-weight: bold; font-size: 1.2em; margin: 10px 5px;">
                ...
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="openFolder">
                    <el-icon>
                      <Folder />
                    </el-icon>
                    Open Install Path
                  </el-dropdown-item>
                  <el-dropdown-item command="createShortcut">
                    <el-icon>
                      <Link />
                    </el-icon>
                    Create Shortcut
                  </el-dropdown-item>
                  <el-dropdown-item command="gameInfo">
                    <el-icon>
                      <InfoFilled />
                    </el-icon>
                    Game Info
                  </el-dropdown-item>
                  <el-dropdown-item command="backup" divided>
                    <el-icon>
                      <Download />
                    </el-icon>
                    Backup Save
                  </el-dropdown-item>
                  <el-dropdown-item command="delete">
                    <el-icon>
                      <Delete />
                    </el-icon>
                    Delete
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <div class="game-playtime-text">
              <div class="game-playtime">
                <p style="font-size: 1.1em; color: black;">Time Played</p>
                <p style="font-weight: bold;">{{ formatTimePlayed(gameData.timePlayed) }}</p>
              </div>
              <div class="game-playtime">
                <p style="font-size: 1.1em; color: black;">Last Played</p>
                <p style="font-weight: bold;">{{ gameData.lastPlayedDisplay }}</p>
              </div>
            </div>
          </div>
        </div>
        <!-- Cover Container -->
        <div class="game-cover">
          <div v-if="gameData.coverImage">
            <img :src="gameData.coverImage" alt="Game Cover">
          </div>
          <div v-else></div>
        </div>
      </div>
      <!-- Detail Info & Description container -->
      <div class="info-row-container">
        <div class="detail-info-container">
          <div class="custom-info-table">
            <div class="info-row">
              <div class="info-label">Install Path</div>
              <div class="info-content">
                <span class="clickable-path" @click="openInstallPath" :title="gameData.installPath">
                  {{ gameData.installPath }}
                </span>
              </div>
            </div>
            <div class="info-row">
              <div class="info-label">Install Size</div>
              <div class="info-content">{{ formatFileSize(gameData.installSize) }}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Genre</div>
              <div class="info-content">{{ gameData.genre }}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Developer</div>
              <div class="info-content">{{ gameData.developer }}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Publisher</div>
              <div class="info-content">{{ gameData.publisher }}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Release Date</div>
              <div class="info-content">{{ gameData.releaseDate }}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Community Score</div>
              <div class="info-content">{{ gameData.communityScore }}</div>
            </div>
            <div class="info-row">
              <div class="info-label">User Score</div>
              <div class="info-content">{{ gameData.personalScore }}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Links</div>
              <div class="info-content">
                <div v-for="(link, index) in gameData.links" :key="index">
                  <a @click.prevent="openExternalLink(link.url)" class="game-link">{{ link.name }}</a>
                </div>
              </div>
            </div>
            <div class="info-row-tags">
              <div class="info-label-tags">Tags</div>
              <div class="info-content-tags">
                <div class="tags-flex-wrap">
                  <el-tag v-for="(tag, index) in gameData.tags" :key="index" style="margin: 2px 6px 2px 0;">
                    {{ tag }}
                  </el-tag>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="description-container">
          <el-card style="margin:10px;">
            <template #header>
              <span style="font-size: 1.5em; color: #409eff; font-weight: bold;">Description</span>
            </template>
            <p v-for="(line, index) in gameData.description" :key="index" class="description-text">{{ line }}</p>
          </el-card>
        </div>
      </div>
    </div>
  </el-scrollbar>
</template>

<script setup lang="ts" name="MainAeraGameInfo">
  import { ref, watch } from 'vue'
  import { useGameStore } from '../stores/game'
  import { Delete, Folder, Link, InfoFilled, Download } from '@element-plus/icons-vue'
  import { ElMessage, ElMessageBox } from 'element-plus'

  const gameStore = useGameStore()

  const gameData = ref<gameData | null>(null)
  const isLoading = ref(false)

  // Format time from seconds to hours and minutes
  function formatTimePlayed(seconds: number): string {
    if (!seconds || seconds === 0) {
      return '0m'
    }

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (hours === 0) {
      return `${minutes}m`
    } else if (minutes === 0) {
      return `${hours}h`
    } else {
      return `${hours}h ${minutes}m`
    }
  }

  // Format file size from bytes to human readable format
  function formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) {
      return '0 B'
    }

    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    const size = bytes / Math.pow(1024, i)

    // For sizes >= 1GB, show 2 decimal places
    // For sizes >= 1MB, show 1 decimal place
    // For smaller sizes, show no decimal places
    if (i >= 3) {
      return `${size.toFixed(2)} ${sizes[i]}`
    } else if (i >= 2) {
      return `${size.toFixed(1)} ${sizes[i]}`
    } else {
      return `${Math.round(size)} ${sizes[i]}`
    }
  }

  // Load the current game data
  async function loadCurrentGameData() {
    if (!gameStore.currentGameUuid) {
      return
    }

    isLoading.value = true
    try {
      const data = await gameStore.loadGameDetail(gameStore.currentGameUuid)
      if (data) {
        gameData.value = data
      } else {
        // If no data found, use default data
        console.warn('No game data found for UUID:', gameStore.currentGameUuid)
        gameStore.currentGameUuid = null
      }
    } catch (error) {
      console.error('Failed to load game data:', error)
    } finally {
      isLoading.value = false
    }
  }

  // Watch for changes in currentGameUuid
  watch(
    () => gameStore.currentGameUuid,
    (newUuid) => {
      if (newUuid) {
        loadCurrentGameData()
      }
    },
    { immediate: true }
  )

  // Watch for changes in gameDetailsCache for the current game
  watch(
    () => gameStore.currentGameUuid ? gameStore.gameDetailsCache.get(gameStore.currentGameUuid) : null,
    (newGameData) => {
      if (newGameData && gameStore.currentGameUuid) {
        console.log('Game data updated in cache, refreshing display:', newGameData.title)
        console.log(newGameData)
        gameData.value = newGameData
      }
    },
    { deep: true }
  )

  // handle play game function
  async function handlePlayGame() {
    if (!gameData.value) {
      ElMessage.error('No game data available')
      return
    }

    try {
      // Show loading message
      const loadingMessage = ElMessage({
        message: 'Launching game...',
        type: 'info',
        duration: 0
      })

      // Launch the game using the electronAPI
      // First try to find a File type action
      let executablePath: string | undefined
      let launchMethodName: string | undefined

      if (gameData.value.actions && gameData.value.actions.length > 0) {
        const fileAction = gameData.value.actions.find(action => action.type === 'File' && action.executablePath)
        if (fileAction && fileAction.executablePath) {
          executablePath = fileAction.executablePath
          launchMethodName = fileAction.name
        }
      }

      if (!executablePath) {
        loadingMessage.close()
        ElMessage.error('No executable path configured. Please edit the game and add an action.')
        return
      }

      const result = await window.electronAPI?.launchGame({
        gameUuid: gameData.value.uuid,
        executablePath: executablePath,
        launchMethodName: launchMethodName
      })

      loadingMessage.close()

      if (result?.success) {
        ElMessage.success(`Game launched successfully!`)
        // Refresh the game data to update last played time
        await loadCurrentGameData()
      } else {
        ElMessage.error('Failed to launch game')
      }
    } catch (error) {
      console.error('Failed to launch game:', error)
      ElMessage.error('Failed to launch game: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  // open edit window function
  async function openEditWindow() {
    if (window.electronAPI?.createEditWindow && gameData.value) {
      try {
        // Pass a plain object to avoid IPC clone errors
        await window.electronAPI.createEditWindow(JSON.parse(JSON.stringify(gameData.value)))
      } catch (error) {
        console.error('Failed to open edit window:', error)
      }
    } else {
      console.error('electronAPI not available or no game data')
    }
  }

  // handle dropdown menu command
  async function handleMenuCommand(command: string) {
    switch (command) {
      case 'delete':
        await handleDeleteGame()
        break
      case 'openFolder':
        ElMessage.info('This function is not implemented yet')
        break
      case 'createShortcut':
        ElMessage.info('This is just a placeholder.\nMay not be implemented in the future.')
        break
      case 'gameInfo':
        ElMessage.info('This is just a placeholder.\nMay not be implemented in the future.')
        break
      case 'backup':
        ElMessage.info('This function is not implemented yet')
        break
      default:
        console.log('Unknown command:', command)
    }
  }

  // handle delete game with confirmation
  async function handleDeleteGame() {
    if (!gameData.value) {
      ElMessage.error('No game data available')
      return
    }

    try {
      await ElMessageBox.confirm(
        `Are you sure you want to delete the game <br>"${gameData.value.title}"?`,
        'Confirm Deletion',
        {
          confirmButtonText: 'Delete',
          cancelButtonText: 'Cancel',
          type: 'warning',
          confirmButtonClass: 'el-button--danger',
          // Lock the scroll will make the scroll background turn white
          lockScroll: false,
          dangerouslyUseHTMLString: true
        }
      )

      // Show loading message
      const loadingMessage = ElMessage({
        message: 'Deleting Game...',
        type: 'info',
        duration: 0
      })

      try {
        await gameStore.deleteGame(gameData.value.uuid)
        loadingMessage.close()
        ElMessage.success('Delete Game Successfully')

        // Clear current selection after deletion
        gameStore.currentGameUuid = null
        gameData.value = null
      } catch (error) {
        loadingMessage.close()
        console.error('Failed to delete game:', error)
        ElMessage.error('Failed to delete game: ' + (error instanceof Error ? error.message : '未知错误'))
      }
    } catch {
      // User cancelled the deletion
      console.log('User cancelled game deletion')
    }
  }

  // Open external link in default browser
  async function openExternalLink(url: string) {
    if (!url) {
      ElMessage.warning('No URL provided')
      return
    }

    try {
      if (window.electronAPI?.openExternalLink) {
        await window.electronAPI.openExternalLink(url)
      } else {
        // Fallback: try to open with window.open (might not work in Electron)
        ElMessage.warning('External link API not available')
      }
    } catch (error) {
      console.error('Failed to open external link:', error)
      ElMessage.error('Failed to open link: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  // Open install path in file explorer
  async function openInstallPath() {
    if (!gameData.value?.installPath) {
      ElMessage.warning('No install path specified')
      return
    }

    try {
      if (window.electronAPI?.openFolder) {
        await window.electronAPI.openFolder(gameData.value.installPath)
        ElMessage.success('Opened install path in file explorer')
      } else {
        ElMessage.warning('Folder opening API not available')
      }
    } catch (error) {
      console.error('Failed to open install path:', error)
      ElMessage.error('Failed to open folder: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }
</script>

<style scoped>
  .background-title-container {
    position: relative;
    width: 100%;
    max-height: 70%;
    overflow: hidden;
  }

  .icon-title-container {
    position: absolute;
    height: 4em;
    width: auto;
    left: 9px;
    bottom: 9px;
    display: flex;
    align-items: center;
    z-index: 3;
  }

  .game-title {
    font-size: 2em;
    font-weight: 600;
    color: #ffffff;
    letter-spacing: 1px;
    margin-left: 0.2em;
    text-shadow:
      0 0 6px rgba(34, 34, 34, 0.40),
      0 0 4px rgba(34, 34, 34, 0.28);
  }

  .game-icon {
    width: auto;
    height: 48px;
    vertical-align: middle;
  }

  .game-background {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center center;
    /* Fix image bottom white bar issue:
       - display: block eliminates baseline alignment whitespace from inline elements
       - height: 100% ensures image fully fills parent container height */
    display: block;
  }

  .main-info-action-container {
    position: relative;
    width: auto;
    height: auto;
    border-top: none;
    padding: 0
  }

  .action-button-container {
    position: relative;
    /* 2px for scoller in game list */
    width: calc(100% - 2px);
    height: 100%;
    bottom: 0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.10);
    display: flex;
    align-items: center;
    justify-content: flex-start;
    background: rgba(255, 255, 255, 0.92);
    z-index: 1;
    margin-left: 2px;
  }

  .button-group {
    display: flex;
    flex-direction: row;
    align-items: center;
    margin-left: 10px;
  }

  .game-playtime-text {
    width: auto;
    height: 100%;
    font-size: 0.85em;
    margin-left: 18px;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 16px;
  }

  .game-playtime {
    line-height: 0.5;
    flex-direction: column;
    align-items: center;
    color: #a174e9;
  }

  .game-cover {
    position: absolute;
    right: 10px;
    bottom: 0;
    width: 25%;
    height: auto;
    z-index: 2;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    pointer-events: none;
  }

  .game-cover img {
    width: 100%;
    height: auto;
    object-fit: cover;
    border-radius: 4px;
    display: block;
    pointer-events: auto;
  }

  .info-row-container {
    display: flex;
    flex-direction: row;
    width: 100%;
    margin-top: 10px;
  }

  .detail-info-container {
    width: 40%;
    height: auto;
    margin: 0 5px;
  }

  .description-container {
    width: 60%;
    height: auto;
    margin: 0 5px;
  }

  .description-text {
    word-break: break-all;
    text-align: justify;
    margin: 2px 0;
    line-height: 1.7;
  }

  .tags-flex-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 6px;
    align-items: flex-start;
    margin: 2px 0;
  }

  .game-link {
    color: #409eff;
    text-decoration: none;
    font-weight: 500;
    cursor: pointer;
    transition: color 0.3s ease;
  }

  .game-link:hover {
    color: #66b1ff;
    text-decoration: underline;
  }

  .clickable-path {
    color: #409eff;
    text-decoration: none;
    font-weight: 500;
    cursor: pointer;
    transition: color 0.3s ease;
  }

  .clickable-path:hover {
    color: #66b1ff;
    text-decoration: underline;
  }

  .custom-info-table {
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.12);
    margin: 10px 0 10px 10px;
  }

  .info-row {
    display: flex;
    border-bottom: 1px solid #ebeef5;
  }

  .info-row:last-child {
    border-bottom: none;
  }

  .info-label {
    width: 100px;
    min-width: 100px;
    padding: 12px;
    background-color: #fafafa;
    border-right: 1px solid #ebeef5;
    font: 1em;
    font-weight: 600;
    color: #409eff;
    word-break: break-word;
    overflow-wrap: break-word;
  }

  .info-content {
    flex: 1;
    padding: 12px;
    background-color: #ffffff;
    font-size: 0.8em;
    word-break: break-word;
    overflow-wrap: break-word;
  }

  .info-row-tags {
    display: flex;
    flex-direction: column;
    border-bottom: 1px solid #ebeef5;
  }

  .info-label-tags {
    width: 100%;
    padding: 12px 12px 8px 12px;
    font: 1em;
    font-weight: 600;
    color: #409eff;
    word-break: break-word;
    overflow-wrap: break-word;
  }

  .info-content-tags {
    width: 100%;
    padding: 8px 12px 12px 12px;
    background-color: #ffffff;
    font-size: 0.8em;
    word-break: break-word;
    overflow-wrap: break-word;
  }

  .loading-container,
  .no-game-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 300px;
    color: #666;
    font-size: 16px;
  }

  .no-game-text {
    text-align: center;
    opacity: 0.7;
  }

  .no-game-text p {
    font-size: 24px;
    font-weight: 600;
    margin: 0 0 8px 0;
    color: #909399;
    letter-spacing: 0.5px;
  }

  .no-game-hint {
    font-size: 14px;
    font-weight: 400;
    color: #c0c4cc;
    opacity: 0.8;
  }
</style>

<style>

  /* Hide overlay of ElMessageBox  */
  /* The overlay can't work on window controls */
  .el-overlay {
    background-color: transparent !important;
  }
</style>