<template>
  <n-scrollbar class="game-info-container">
    <n-spin :show="isLoading" description="Loading game data...">
      <div v-if="!isLoading && ((!gameStore.currentGameUuid) || (!gameData))" class="no-game-container">
        <div class="no-game-text">
          <p>No game selected</p>
          <span class="no-game-hint">Please select a game from the sidebar</span>
        </div>
      </div>
      <div v-else-if="!isLoading && gameData">
        <!-- Background & Title Container-->
        <div class="background-title-container">
          <div v-if="gameData.backgroundImageDisplay">
            <img :src="gameData.backgroundImageDisplay" alt="Game Background" class="game-background" />
          </div>
          <div v-else>
            <img :src="defaultBackground" alt="Default Background" class="game-background" />
          </div>
          <!-- Icon & Title Container -->
          <div class="icon-title-container">
            <div v-if="gameData.iconImageDisplay" class="game-icon-container">
              <img :src="gameData.iconImageDisplay" alt="Game Icon" class="game-icon" />
            </div>
            <div v-else class="game-icon-container">
              <img :src="defaultIcon" alt="Default Icon" class="game-icon" />
            </div>
            <span class="game-title">{{ gameData.title }}</span>
          </div>
        </div>
        <!-- Main Info & Actions Container  -->
        <div class="main-info-action-container">
          <!-- Action Button Container -->
          <div class="action-button-container">
            <div class="button-group">
              <n-button type="primary" size="large" color="#4080ff"
                style="font-weight: bold; font-size: 1.2em; margin: 10px 5px; padding: 0 40px;"
                @click="handlePlayGame"><span style="color: var(--color-info-content)">Play</span></n-button>
              <n-button type="primary" size="large" color="#4080ff"
                style="font-weight: bold; font-size: 1.2em; margin: 10px 5px;" @click="openEditWindow"><span
                  style="color: var(--color-info-content)">Edit</span></n-button>
              <n-dropdown trigger="click" :options="dropdownOptions" @select="handleMenuCommand">
                <n-button type="primary" size="large" color="#4080ff"
                  style="font-weight: bold; font-size: 1.2em; margin: 10px 5px;">
                  <span style="color: var(--color-info-content)">...</span>
                </n-button>
              </n-dropdown>
              <div class="game-playtime-text">
                <div class="game-playtime">
                  <p style="font-size: 1.1em;">Time Played</p>
                  <p style="font-weight: bold;">{{ formatTimePlayed(gameData.timePlayed) }}</p>
                </div>
                <div class="game-playtime">
                  <p style="font-size: 1.1em;">Last Played</p>
                  <p style="font-weight: bold;">{{ gameData.lastPlayedDisplay }}</p>
                </div>
              </div>
            </div>
          </div>
          <!-- Cover Container -->
          <div class="game-cover">
            <div v-if="gameData.coverImageDisplay">
              <img :src="gameData.coverImageDisplay" alt="Game Cover">
            </div>
            <div v-else></div>
          </div>
        </div>
        <!-- Detail Info & Description container -->
        <div class="info-row-container">
          <div class="detail-info-container">
            <div class="custom-info-table">
              <div class="info-row">
                <div class="info-label">Working Path</div>
                <div class="info-content">
                  <span class="clickable-path" @click="openworkingDir" :title="gameData.workingDir">
                    {{ gameData.workingDir }}
                  </span>
                </div>
              </div>
              <div class="info-row">
                <div class="info-label">Folder Size</div>
                <div class="info-content">{{ formatFileSize(gameData.folderSize) }}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Genre</div>
                <div class="info-content">{{ Array.isArray(gameData.genre) ? gameData.genre.join(', ') : gameData.genre }}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Developer</div>
                <div class="info-content">{{ Array.isArray(gameData.developer) ? gameData.developer.join(', ') : gameData.developer }}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Publisher</div>
                <div class="info-content">{{ Array.isArray(gameData.publisher) ? gameData.publisher.join(', ') : gameData.publisher }}</div>
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
                <div class="info-content"
                  style="display: flex; flex-direction: column; gap: 4px; align-items: flex-start;">
                  <div v-for="(link, index) in gameData.links" :key="index">
                    <a @click.prevent="openExternalLink(link.url)" class="game-link">{{ link.name }}</a>
                  </div>
                </div>
              </div>
              <div class="info-row-tags">
                <div class="info-label-tags">Tags</div>
                <div class="info-content-tags">
                  <div class="tags-flex-wrap">
                    <n-tag
                      :color="{ color: 'rgba(64, 128, 255, 0.1)', textColor: '#4080ff', borderColor: 'rgba(64, 128, 255, 0.2)' }"
                      v-for="(tag, index) in gameData.tags" :key="index" style="margin: 2px 6px 2px 0;">
                      {{ tag }}
                    </n-tag>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="description-container">
            <n-card class="description-card">
              <template #header>
                <span style="font-size: 1.5em; color: #409eff; font-weight: bold;">Description</span>
              </template>
              <p v-for="(line, index) in gameData.description" :key="index" class="description-text">{{ line }}</p>
            </n-card>
          </div>
        </div>
      </div>
    </n-spin>
  </n-scrollbar>
</template>

<script setup lang="ts" name="MainAeraGameInfo">
  import { storeToRefs } from 'pinia';
  import { ref, watch, computed, h } from 'vue'
  import { useGameStore } from '../stores/game'
  import { useMessage, useDialog } from 'naive-ui'
  import type { DropdownOption } from 'naive-ui'
  import { NIcon } from 'naive-ui'
  import { DeleteOutlined, FolderOutlined, LinkOutlined, InfoOutlined, DownloadOutlined } from '@vicons/material'
  import defaultBackground from '/default/ML-Maid-Background.png'
  import defaultIcon from '/default/ML-Maid-Icon-W.png'

  const gameStore = useGameStore()
  const { gameDetailsCache, currentGameUuid } = storeToRefs(gameStore)
  const gameData = computed(() => {
    return currentGameUuid.value
      ? gameDetailsCache.value.get(currentGameUuid.value) || null
      : null
  })
  const isLoading = ref(false)
  const message = useMessage()
  const dialog = useDialog()

  // Dropdown menu options
  const renderIcon = (icon: any) => {
    return () => h(NIcon, null, { default: () => h(icon) })
  }

  const dropdownOptions: DropdownOption[] = [
    {
      label: 'Open Install Path',
      key: 'openFolder',
      icon: renderIcon(FolderOutlined)
    },
    {
      label: 'Create Shortcut',
      key: 'createShortcut',
      icon: renderIcon(LinkOutlined)
    },
    {
      label: 'Game Info',
      key: 'gameInfo',
      icon: renderIcon(InfoOutlined)
    },
    {
      type: 'divider',
      key: 'divider1'
    },
    {
      label: 'Backup Save',
      key: 'backup',
      icon: renderIcon(DownloadOutlined)
    },
    {
      label: 'Delete',
      key: 'delete',
      icon: renderIcon(DeleteOutlined)
    }
  ]


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

  // Watch for changes in currentGameUuid (debugging purpose)
  watch(
    () => currentGameUuid.value,
    (newUuid) => {
      if (newUuid) {
        console.log(newUuid)
        console.log(gameData.value)
      }
    },
    { immediate: true }
  )

  // handle play game function
  async function handlePlayGame() {
    if (!gameData.value) {
      message.error('No game data available')
      return
    }

    try {
      // Show loading message
      const loadingMsg = message.loading('Launching game...', { duration: 0 })

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
        loadingMsg.destroy()
        message.error('No executable path configured. Please edit the game and add an action.')
        return
      }

      // Create a clean object to avoid IPC cloning issues
      const launchParams = {
        gameUuid: String(gameData.value.uuid || ''),
        executablePath: String(executablePath),
        launchMethodName: String(launchMethodName || ''),
        workingDir: String(gameData.value.workingDir || executablePath.substring(0, executablePath.lastIndexOf('\\'))),
        procMonMode: Number(gameData.value.procMonMode || 1), // Default to FOLDER mode
        procNames: Array.isArray(gameData.value.procNames) ? [...gameData.value.procNames] : []
      }

      console.log('Launch parameters:', launchParams) // Debug info

      const result = await window.electronAPI?.launchGame(launchParams)

      loadingMsg.destroy()

      if (result?.success) {
        message.success(`Game launched successfully!`)
      } else {
        message.error('Failed to launch game')
      }
    } catch (error) {
      console.error('Failed to launch game:', error)
      message.error('Failed to launch game: ' + (error instanceof Error ? error.message : 'Unknown error'))
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
  async function handleMenuCommand(key: string) {
    switch (key) {
      case 'delete':
        await handleDeleteGame()
        break
      case 'openFolder':
        message.info('This function is not implemented yet')
        break
      case 'createShortcut':
        message.info('This is just a placeholder.\nMay not be implemented in the future.')
        break
      case 'gameInfo':
        message.info('This is just a placeholder.\nMay not be implemented in the future.')
        break
      case 'backup':
        message.info('This function is not implemented yet')
        break
      default:
        console.log('Unknown command:', key)
    }
  }

  // handle delete game with confirmation
  async function handleDeleteGame() {
    if (!gameData.value) {
      message.error('No game data available')
      return
    }

    dialog.warning({
      title: 'Confirm Deletion',
      content: `Are you sure you want to delete the game "${gameData.value.title}"?`,
      positiveText: 'Delete',
      negativeText: 'Cancel',
      onPositiveClick: async () => {
        // Show loading message
        const loadingMsg = message.loading('Deleting Game...', { duration: 0 })

        try {
          await gameStore.deleteGame(gameData.value!.uuid)
          loadingMsg.destroy()
          message.success('Delete Game Successfully')

          // Clear current selection after deletion
          gameStore.currentGameUuid = null
        } catch (error) {
          loadingMsg.destroy()
          console.error('Failed to delete game:', error)
          message.error('Failed to delete game: ' + (error instanceof Error ? error.message : '未知错误'))
        }
      },
      onNegativeClick: () => {
        console.log('User cancelled game deletion')
      }
    })
  }

  // Open external link in default browser
  async function openExternalLink(url: string) {
    if (!url) {
      message.warning('No URL provided')
      return
    }

    try {
      if (window.electronAPI?.openExternalLink) {
        await window.electronAPI.openExternalLink(url)
      } else {
        // Fallback: try to open with window.open (might not work in Electron)
        message.warning('External link API not available')
      }
    } catch (error) {
      console.error('Failed to open external link:', error)
      message.error('Failed to open link: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  // Open install path in file explorer
  async function openworkingDir() {
    if (!gameData.value?.workingDir) {
      message.warning('No install path specified')
      return
    }

    try {
      if (window.electronAPI?.openFolder) {
        await window.electronAPI.openFolder(gameData.value.workingDir)
        message.success('Opened install path in file explorer')
      } else {
        message.warning('Folder opening API not available')
      }
    } catch (error) {
      console.error('Failed to open install path:', error)
      message.error('Failed to open folder: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }
</script>

<style scoped>
  .game-info-container {
    height: 100%;
  }

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
    color: var(--color-title);
    letter-spacing: 1px;
    margin-left: 0.2em;
    text-shadow:
      0 0 6px var(--shadow-title-1),
      0 0 4px var(--shadow-title-2);
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
    width: calc(100% - 2px);
    height: 100%;
    bottom: 0;
    box-shadow: var(--shadow-action-bar);
    display: flex;
    align-items: center;
    justify-content: flex-start;
    background: var(--bg-action-bar);
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
    color: var(--color-playtime);
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

  .description-card {
    margin: 10px;
    width: 97%;
    background: var(--bg-info-content);
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
    color: var(--color-link);
    text-decoration: none;
    font-weight: 500;
    cursor: pointer;
    transition: color 0.3s ease;
  }

  .game-link:hover {
    color: var(--color-link-hover);
    text-decoration: underline;
  }

  .clickable-path {
    color: var(--color-link);
    text-decoration: none;
    font-weight: 500;
    cursor: pointer;
    transition: color 0.3s ease;
  }

  .clickable-path:hover {
    color: var(--color-link-hover);
    text-decoration: underline;
  }

  .custom-info-table {
    border-radius: 8px;
    overflow: hidden;
    box-shadow: var(--shadow-info-table);
    margin: 10px 0 10px 10px;
  }

  .info-row {
    display: flex;
    border-bottom: 1px solid var(--border-info-row);
  }

  .info-row:last-child {
    border-bottom: none;
  }

  .info-label {
    width: 100px;
    min-width: 100px;
    padding: 12px;
    background-color: var(--bg-info-label);
    border-right: 1px solid var(--border-info-row);
    font: 1em;
    font-weight: 600;
    color: var(--color-info-label);
    word-break: break-word;
    overflow-wrap: break-word;
  }

  .info-content {
    flex: 1;
    padding: 12px;
    background-color: var(--bg-info-content);
    color: var(--color-info-content);
    word-break: break-word;
    overflow-wrap: break-word;
    display: flex;
    align-items: center;
  }

  .info-row-tags {
    display: flex;
    flex-direction: column;
    border-bottom: 1px solid var(--border-info-row);
  }

  .info-label-tags {
    width: 100%;
    padding: 12px 12px 8px 12px;
    font: 1em;
    font-weight: 600;
    background-color: var(--bg-info-label);
    color: var(--color-info-label);
    word-break: break-word;
    overflow-wrap: break-word;
  }

  .info-content-tags {
    padding: 8px 12px 12px 12px;
    background-color: var(--bg-info-content);
    color: var(--color-info-content);
    font-size: 0.8em;
    word-break: break-word;
    overflow-wrap: break-word;
  }

  .no-game-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 300px;
    color: var(--color-muted);
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
    color: var(--color-muted-dark);
    letter-spacing: 0.5px;
  }

  .no-game-hint {
    font-size: 14px;
    font-weight: 400;
    color: var(--color-muted-light);
    opacity: 0.8;
  }
</style>