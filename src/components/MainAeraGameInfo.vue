<template>
  <n-scrollbar class="game-info-container">
    <n-spin :show="isLoading" :description="$t('gameInfo.loading')">
      <div v-if="!isLoading && ((!gameStore.currentGameUuid) || (!gameData))" class="no-game-container">
        <div class="no-game-text">
          <p>{{ $t('gameInfo.noGameSelected') }}</p>
          <span class="no-game-hint">{{ $t('gameInfo.selectGameHint') }}</span>
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
              <n-button type="primary" size="large" class="action-bar-btn action-bar-btn--play"
                :disabled="isCurrentGamePlaying" @click="handlePlayGame">{{ isCurrentGamePlaying ?
                  $t('gameInfo.playing') : $t('gameInfo.play') }}</n-button>
              <n-button type="primary" size="large" class="action-bar-btn" @click="openEditWindow">{{
                $t('gameInfo.edit') }}</n-button>
              <n-dropdown trigger="click" :options="dropdownOptions" @select="handleMenuCommand">
                <n-button type="primary" size="large" class="action-bar-btn">...</n-button>
              </n-dropdown>
              <div class="game-playtime-text">
                <div class="game-playtime">
                  <p style="font-size: 1.1em;">{{ $t('gameInfo.timePlayed') }}</p>
                  <p style="font-weight: bold;">{{ formatTimePlayed(gameData.timePlayed) }}</p>
                </div>
                <div class="game-playtime">
                  <p style="font-size: 1.1em;">{{ $t('gameInfo.lastPlayed') }}</p>
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
                <div class="info-label">{{ $t('gameInfo.workingPath') }}</div>
                <div class="info-content">
                  <n-icon size="18" class="info-icon">
                    <FolderOutlined />
                  </n-icon>
                  <span class="clickable-path" @click="openworkingDir" :title="gameData.workingDir">
                    {{ gameData.workingDir }}
                  </span>
                </div>
              </div>
              <div class="info-row">
                <div class="info-label">{{ $t('gameInfo.folderSize') }}</div>
                <div class="info-content">
                  <n-icon size="18" class="info-icon">
                    <SdStorageOutlined />
                  </n-icon>
                  <span style="font-weight: bold;">{{ formatFileSize(gameData.folderSize).value }}</span>
                  <span class="size-unit">{{ formatFileSize(gameData.folderSize).unit }}</span>
                </div>
              </div>
              <div class="info-row">
                <div class="info-label">{{ $t('gameInfo.genre') }}</div>
                <div class="info-content">
                  <div class="tags-flex-wrap">
                    <template v-if="Array.isArray(gameData.genre)">
                      <n-tag v-for="(item, index) in gameData.genre" :key="index" :color="tagColor">
                        {{ item }}
                      </n-tag>
                    </template>
                    <template v-else-if="gameData.genre">
                      <n-tag :color="tagColor">
                        {{ gameData.genre }}
                      </n-tag>
                    </template>
                  </div>
                </div>
              </div>
              <div class="info-row">
                <div class="info-label">{{ $t('gameInfo.developer') }}</div>
                <div class="info-content">
                  <div class="tags-flex-wrap">
                    <template v-if="Array.isArray(gameData.developer)">
                      <n-tag v-for="(item, index) in gameData.developer" :key="index" :color="tagColor">
                        {{ item }}
                      </n-tag>
                    </template>
                    <template v-else-if="gameData.developer">
                      <n-tag :color="tagColor">
                        {{ gameData.developer }}
                      </n-tag>
                    </template>
                  </div>
                </div>
              </div>
              <div class="info-row">
                <div class="info-label">{{ $t('gameInfo.publisher') }}</div>
                <div class="info-content">
                  <div class="tags-flex-wrap">
                    <template v-if="Array.isArray(gameData.publisher)">
                      <n-tag v-for="(item, index) in gameData.publisher" :key="index" :color="tagColor">
                        {{ item }}
                      </n-tag>
                    </template>
                    <template v-else-if="gameData.publisher">
                      <n-tag :color="tagColor">
                        {{ gameData.publisher }}
                      </n-tag>
                    </template>
                  </div>
                </div>
              </div>
              <div class="info-row">
                <div class="info-label">{{ $t('gameInfo.releaseDate') }}</div>
                <div class="info-content">
                  <n-icon size="18" class="info-icon">
                    <CalendarTodayOutlined />
                  </n-icon>
                  {{ gameData.releaseDateDisplay }}
                </div>
              </div>
              <div class="info-row">
                <div class="info-label">{{ $t('gameInfo.communityScore') }}</div>
                <div class="info-content">
                  <span :style="{ color: getScoreColor(gameData.communityScore), fontWeight: 'bold' }">
                    {{ gameData.communityScore }}
                  </span>
                </div>
              </div>
              <div class="info-row">
                <div class="info-label">{{ $t('gameInfo.userScore') }}</div>
                <div class="info-content">
                  <span :style="{ color: getScoreColor(gameData.personalScore), fontWeight: 'bold' }">
                    {{ gameData.personalScore }}
                  </span>
                </div>
              </div>
              <div class="info-row">
                <div class="info-label">{{ $t('gameInfo.links') }}</div>
                <div class="info-content" style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">
                  <n-tooltip trigger="hover" v-for="(link, index) in gameData.links" :key="index">
                    <template #trigger>
                      <n-button size="tiny" secondary type="primary" @click="openExternalLink(link.url)">
                        <template #icon>
                          <n-icon>
                            <OpenInNewOutlined />
                          </n-icon>
                        </template>
                        {{ link.name }}
                      </n-button>
                    </template>
                    {{ link.url }}
                  </n-tooltip>
                </div>
              </div>
              <div class="info-row-tags">
                <div class="info-label-tags">{{ $t('gameInfo.tags') }}</div>
                <div class="info-content-tags">
                  <div class="tags-flex-wrap">
                    <n-tag :color="tagColor" v-for="(tag, index) in gameData.tags" :key="index">
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
                <span class="description-title">{{ $t('gameInfo.description') }}</span>
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
  import { ref, watch, computed, h, onMounted, onUnmounted } from 'vue'
  import { useGameStore } from '../stores/game'
  import { useModalStore } from '../stores/modal'
  import { api } from '@/api'
  import { useMessage, useDialog } from 'naive-ui'
  import type { DropdownOption } from 'naive-ui'
  import { NIcon } from 'naive-ui'
  import { DeleteOutlined, FolderOutlined, LinkOutlined, InfoOutlined, DownloadOutlined, SdStorageOutlined, CalendarTodayOutlined, OpenInNewOutlined } from '@vicons/material'
  import defaultBackground from '/default/ML-Maid-Background.png'
  import defaultIcon from '/default/ML-Maid-Icon-W.png'
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()

  const gameStore = useGameStore()
  const modalStore = useModalStore()
  const { gameDetailsCache, currentGameUuid } = storeToRefs(gameStore)
  const gameData = computed(() => {
    return currentGameUuid.value
      ? gameDetailsCache.value.get(currentGameUuid.value) || null
      : null
  })
  const isLoading = ref(false)
  const playingGameUuids = ref(new Set<string>())
  const message = useMessage()
  const dialog = useDialog()

  // Shared tint style for all metadata tags (CSS vars keep it theme-adaptive)
  const tagColor = {
    color: 'var(--primary-tint)',
    textColor: 'var(--primary)',
    borderColor: 'var(--primary-tint-strong)'
  }

  // Whether the currently displayed game is playing
  const isCurrentGamePlaying = computed(() => {
    return currentGameUuid.value ? playingGameUuids.value.has(currentGameUuid.value) : false
  })

  // Listen for game-stopped events to reset playing state
  let unsubscribeGameStopped: (() => void) | null = null
  onMounted(() => {
    unsubscribeGameStopped = api.onGameStopped((data: { gameUuid: string }) => {
      playingGameUuids.value.delete(data.gameUuid)
      // Trigger reactivity
      playingGameUuids.value = new Set(playingGameUuids.value)
    })
  })
  onUnmounted(() => {
    unsubscribeGameStopped?.()
  })

  // Dropdown menu options
  const renderIcon = (icon: any) => {
    return () => h(NIcon, null, { default: () => h(icon) })
  }

  const dropdownOptions: DropdownOption[] = [
    {
      label: () => t('gameInfo.dropdown.openInstallPath'),
      key: 'openFolder',
      icon: renderIcon(FolderOutlined)
    },
    {
      label: () => t('gameInfo.dropdown.createShortcut'),
      key: 'createShortcut',
      icon: renderIcon(LinkOutlined)
    },
    {
      label: () => t('gameInfo.dropdown.gameInfo'),
      key: 'gameInfo',
      icon: renderIcon(InfoOutlined)
    },
    {
      type: 'divider',
      key: 'divider1'
    },
    {
      label: () => t('gameInfo.dropdown.backupSave'),
      key: 'backup',
      icon: renderIcon(DownloadOutlined)
    },
    {
      label: () => t('gameInfo.dropdown.delete'),
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
  function formatFileSize(bytes: number): { value: string, unit: string } {
    if (!bytes || bytes === 0) {
      return { value: '0', unit: 'B' }
    }

    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    const size = bytes / Math.pow(1024, i)
    let valueStr = ''

    // For sizes >= 1GB, show 2 decimal places
    // For sizes >= 1MB, show 1 decimal place
    // For smaller sizes, show no decimal places
    if (i >= 3) {
      valueStr = size.toFixed(2)
    } else if (i >= 2) {
      valueStr = size.toFixed(1)
    } else {
      valueStr = Math.round(size).toString()
    }

    return { value: valueStr, unit: sizes[i] || 'B' }
  }

  // Get color for score
  function getScoreColor(score: string | number | undefined): string {
    if (score === undefined || score === null) return 'inherit'
    const num = parseFloat(String(score))
    if (isNaN(num)) return 'inherit'

    // Check if it's likely 100-scale or 10-scale
    // If score > 10, assume 100 scale
    // If score <= 10, assume 10 scale
    const is100Scale = num > 10

    if (is100Scale) {
      if (num >= 80) return 'var(--color-success)'
      if (num >= 60) return 'var(--color-warning)'
      return 'var(--color-danger)'
    } else {
      if (num >= 8) return 'var(--color-success)'
      if (num >= 6) return 'var(--color-warning)'
      return 'var(--color-danger)'
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
      message.error(t('gameInfo.messages.noGameData'))
      return
    }

    // Validate executable path before showing loading message
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
      message.error(t('gameInfo.messages.noExecutable'))
      return
    }

    // Show loading message only after validation passes
    const loadingMsg = message.loading(t('gameInfo.messages.launching'), { duration: 0 })

    try {
      // Create a clean object to avoid IPC cloning issues
      const launchParams = {
        gameUuid: String(gameData.value.uuid || ''),
        executablePath: String(executablePath),
        launchMethodName: String(launchMethodName || ''),
        workingDir: String(gameData.value.workingDir || executablePath.substring(0, executablePath.lastIndexOf('\\'))),
        procMonMode: Number(gameData.value.procMonMode || 1), // Default to FOLDER mode
        procNames: Array.isArray(gameData.value.procNames) ? [...gameData.value.procNames] : [],
        localeEmulation: Number(gameData.value.localeEmulation || 0)
      }

      console.log('Launch parameters:', launchParams) // Debug info

      const result = await api.launchGame(launchParams)

      if (result?.success) {
        message.success(t('gameInfo.messages.launchSuccess'))
        // Mark the game as playing
        playingGameUuids.value.add(launchParams.gameUuid)
        playingGameUuids.value = new Set(playingGameUuids.value)
      } else {
        message.error(t('gameInfo.messages.launchFailed'))
      }
    } catch (error) {
      console.error('Failed to launch game:', error)
      message.error(t('gameInfo.messages.launchError', { error: error instanceof Error ? error.message : t('gameInfo.messages.unknownError') }))
    } finally {
      loadingMsg.destroy()
    }
  }

  // open the in-app edit modal
  async function openEditWindow() {
    if (!gameData.value) {
      console.error('No game data available')
      return
    }
    modalStore.openEditModal(JSON.parse(JSON.stringify(gameData.value)))
  }

  // handle dropdown menu command
  async function handleMenuCommand(key: string) {
    switch (key) {
      case 'delete':
        await handleDeleteGame()
        break
      case 'openFolder':
        message.info(t('gameInfo.messages.notImplemented'))
        break
      case 'createShortcut':
        message.info(t('gameInfo.messages.placeholder'))
        break
      case 'gameInfo':
        message.info(t('gameInfo.messages.placeholder'))
        break
      case 'backup':
        message.info(t('gameInfo.messages.notImplemented'))
        break
      default:
        console.log('Unknown command:', key)
    }
  }

  // handle delete game with confirmation
  async function handleDeleteGame() {
    if (!gameData.value) {
      message.error(t('gameInfo.messages.noGameData'))
      return
    }

    dialog.warning({
      title: t('gameInfo.messages.confirmDeletion'),
      content: t('gameInfo.messages.deleteConfirm', { title: gameData.value.title }),
      positiveText: t('gameInfo.messages.deleteButton'),
      negativeText: t('gameInfo.messages.cancelButton'),
      onPositiveClick: async () => {
        // Show loading message
        const loadingMsg = message.loading(t('gameInfo.messages.deleting'), { duration: 0 })

        try {
          await gameStore.deleteGame(gameData.value!.uuid)
          loadingMsg.destroy()
          message.success(t('gameInfo.messages.deleteSuccess'))

          // Clear current selection after deletion
          gameStore.currentGameUuid = null
        } catch (error) {
          loadingMsg.destroy()
          console.error('Failed to delete game:', error)
          message.error(t('gameInfo.messages.deleteError', { error: error instanceof Error ? error.message : t('gameInfo.messages.unknownError') }))
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
      message.warning(t('gameInfo.messages.noUrl'))
      return
    }

    try {
      await api.openExternalLink(url)
    } catch (error) {
      console.error('Failed to open external link:', error)
      message.error(t('gameInfo.messages.linkError', { error: error instanceof Error ? error.message : t('gameInfo.messages.unknownError') }))
    }
  }

  // Open install path in file explorer
  async function openworkingDir() {
    if (!gameData.value?.workingDir) {
      message.warning(t('gameInfo.messages.noInstallPath'))
      return
    }

    try {
      await api.openFolder(gameData.value.workingDir)
      message.success(t('gameInfo.messages.openedFolder'))
    } catch (error) {
      console.error('Failed to open install path:', error)
      message.error(t('gameInfo.messages.folderError', { error: error instanceof Error ? error.message : t('gameInfo.messages.unknownError') }))
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

  .action-bar-btn {
    font-weight: bold;
    font-size: 16px;
    margin: 10px 5px;
  }

  .action-bar-btn--play {
    padding: 0 40px;
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
    font-variant-numeric: tabular-nums;
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
    border-radius: var(--radius-sm);
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

  .clickable-path {
    color: var(--color-link);
    text-decoration: none;
    font-weight: 500;
    cursor: pointer;
    transition: color var(--duration-fast) var(--ease-standard);
  }

  .clickable-path:hover {
    color: var(--color-link-hover);
    text-decoration: underline;
  }

  .info-icon {
    margin-right: 8px;
    color: var(--color-muted);
  }

  .size-unit {
    font-size: 12px;
    color: var(--color-muted);
    margin-left: 4px;
  }

  .description-title {
    font-size: 20px;
    color: var(--primary);
    font-weight: bold;
  }

  .custom-info-table {
    border-radius: var(--radius-md);
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
    font-size: 14px;
    font-weight: 600;
    color: var(--color-info-label);
    word-break: break-word;
    overflow-wrap: break-word;
  }

  .info-content {
    flex: 1;
    padding: 6px 10px;
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
    font-size: 14px;
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