<template>
  <n-scrollbar class="game-info-container">
    <n-spin :show="isLoading" :description="$t('gameInfo.loading')">
      <div v-if="!isLoading && ((!gameStore.currentGameUuid) || (!gameData))" class="no-game-container">
        <div class="no-game-text">
          <div class="no-game-icon-circle">
            <n-icon size="46">
              <SportsEsportsOutlined />
            </n-icon>
          </div>
          <p>{{ $t('gameInfo.noGameSelected') }}</p>
          <span class="no-game-hint">{{ $t('gameInfo.selectGameHint') }}</span>
        </div>
      </div>
      <div v-else-if="!isLoading && gameData" class="game-detail">
        <div class="detail-content">
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
                  <div class="playtime-item">
                    <span class="playtime-label">{{ $t('gameInfo.timePlayed') }}</span>
                    <span class="playtime-value">{{ formatTimePlayed(gameData.timePlayed) }}</span>
                  </div>
                  <div class="playtime-item">
                    <span class="playtime-label">{{ $t('gameInfo.lastPlayed') }}</span>
                    <span class="playtime-value">{{ gameData.lastPlayedDisplay }}</span>
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
                    <n-tooltip trigger="hover">
                      <template #trigger>
                        <span class="clickable-path" @click="openworkingDir">
                          {{ gameData.workingDir }}
                        </span>
                      </template>
                      {{ gameData.workingDir }}
                    </n-tooltip>
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
              <div class="description-card" @click="handleDescriptionClick">
                <div class="description-title">{{ $t('gameInfo.description') }}</div>
                <!-- Lines are sanitized (whitelist) before v-html, see sanitizeHtml -->
                <p v-for="(line, index) in descriptionHtml" :key="index" class="description-text" v-html="line"></p>
              </div>
            </div>
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
  import { DeleteOutlined, FolderOutlined, LinkOutlined, InfoOutlined, DownloadOutlined, SdStorageOutlined, CalendarTodayOutlined, OpenInNewOutlined, SportsEsportsOutlined } from '@vicons/material'
  import defaultBackground from '/default/ML-Maid-Background.png'
  import defaultIcon from '/default/ML-Maid-Icon-W.png'
  import { useI18n } from 'vue-i18n'
  import { sanitizeHtml } from '@/utils/sanitizeHtml'

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

  // Description lines support simple HTML styling; sanitize before v-html
  const descriptionHtml = computed(() =>
    (gameData.value?.description ?? []).map(line => sanitizeHtml(line))
  )

  // Delegate clicks on <a> inside the description to the system browser
  // (a plain anchor click would navigate the whole webview away from the app)
  function handleDescriptionClick(event: MouseEvent) {
    const anchor = (event.target as HTMLElement | null)?.closest('a')
    if (!anchor) return
    event.preventDefault()
    const href = anchor.getAttribute('href')
    if (href && /^https?:\/\//i.test(href)) {
      openExternalLink(href)
    }
  }

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

  /* ---- Immersive detail shell (ambient wash is shared, in MainView) ---- */
  .game-detail {
    position: relative;
    min-height: 100%;
  }

  .detail-content {
    position: relative;
    z-index: 1;
  }

  /* ---- Hero ---- */
  .background-title-container {
    position: relative;
    width: 100%;
    height: 56vh;
    min-height: 320px;
    overflow: hidden;
  }

  .game-background {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center 30%;
    display: block;
  }

  /* Scrim darkens the lower hero so the title stays legible */
  .background-title-container::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom,
        rgba(0, 0, 0, 0) 45%,
        rgba(0, 0, 0, 0.5) 100%);
    pointer-events: none;
  }

  .icon-title-container {
    position: absolute;
    left: 24px;
    bottom: 34px;
    display: flex;
    align-items: center;
    gap: 16px;
    z-index: 3;
  }

  .game-icon-container {
    display: flex;
  }

  .game-icon {
    width: auto;
    height: 56px;
    border-radius: var(--radius-sm);
  }

  .game-title {
    font-size: 30px;
    font-weight: 700;
    color: #fff;
    letter-spacing: 0.4px;
    text-shadow: 0 2px 14px rgba(0, 0, 0, 0.6), 0 0 6px rgba(0, 0, 0, 0.45);
  }

  /* ---- Action bar (full-width, flush under the hero) ---- */
  .main-info-action-container {
    position: relative;
    z-index: 2;
  }

  /* Gradient lead-in: the (more opaque) action-bar colour rises out of the hero */
  .main-info-action-container::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 100%;
    height: 48px;
    background: linear-gradient(to bottom, transparent 0%, var(--glass-strong) 100%);
    pointer-events: none;
  }

  .action-button-container {
    position: relative;
    display: flex;
    align-items: center;
    padding: 14px 20px;
    background: var(--glass-strong);
    box-shadow: var(--shadow-action-bar);
  }

  .button-group {
    display: flex;
    flex-direction: row;
    align-items: center;
  }

  .action-bar-btn {
    color: #fff;
    font-weight: bold;
    font-size: 15px;
    margin: 4px 5px;
  }

  .action-bar-btn--play {
    padding: 0 34px;
  }

  .game-playtime-text {
    margin-left: 24px;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 28px;
  }

  .playtime-item {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .playtime-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.4px;
    color: var(--color-muted);
    text-transform: uppercase;
  }

  .playtime-value {
    font-size: 14px;
    font-weight: 700;
    color: var(--color-playtime);
    font-variant-numeric: tabular-nums;
  }

  /* ---- Floating cover ---- */
  .game-cover {
    position: absolute;
    right: 24px;
    bottom: 10px;
    width: min(30%, 230px);
    z-index: 3;
    pointer-events: none;
  }

  .game-cover img {
    width: 100%;
    height: auto;
    object-fit: cover;
    border-radius: var(--radius-md);
    border: 1px solid var(--glass-border);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    display: block;
    pointer-events: auto;
  }

  /* ---- Info + description ---- */
  .info-row-container {
    display: flex;
    flex-direction: row;
    width: 100%;
    gap: 16px;
    padding: 20px 18px 24px;
    box-sizing: border-box;
  }

  .detail-info-container {
    width: 40%;
    flex-shrink: 0;
  }

  .description-container {
    flex: 1;
    min-width: 0;
  }

  .custom-info-table {
    border-radius: var(--radius-md);
    overflow: hidden;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow);
  }

  .info-row {
    display: flex;
    align-items: stretch;
    border-bottom: 1px solid var(--border-info-row);
  }

  .info-row:last-child {
    border-bottom: none;
  }

  .info-label {
    width: 66px;
    min-width: 66px;
    padding: 11px 14px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.2px;
    color: var(--color-muted);
    word-break: break-word;
    overflow-wrap: break-word;
    display: flex;
    align-items: center;
  }

  .info-content {
    flex: 1;
    min-width: 0;
    padding: 9px 14px;
    color: var(--color-info-content);
    word-break: break-word;
    overflow-wrap: break-word;
    display: flex;
    align-items: center;
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

  .clickable-path {
    color: var(--color-link);
    text-decoration: none;
    font-weight: 500;
    cursor: pointer;
    transition: color var(--duration-fast) var(--ease-standard);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .clickable-path:hover {
    color: var(--color-link-hover);
    text-decoration: underline;
  }

  .tags-flex-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 6px;
    align-items: flex-start;
    margin: 2px 0;
  }

  .info-row-tags {
    display: flex;
    flex-direction: column;
    border-top: 1px solid var(--border-info-row);
  }

  .info-label-tags {
    width: 100%;
    padding: 11px 14px 6px 14px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.2px;
    color: var(--color-muted);
    word-break: break-word;
    overflow-wrap: break-word;
  }

  .info-content-tags {
    padding: 4px 14px 12px 14px;
    color: var(--color-info-content);
    font-size: 0.85em;
    word-break: break-word;
    overflow-wrap: break-word;
  }

  .description-card {
    box-sizing: border-box;
    width: 100%;
    padding: 16px 18px;
    border-radius: var(--radius-md);
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow);
  }

  .description-title {
    display: block;
    font-size: 18px;
    color: var(--primary);
    font-weight: bold;
    margin-bottom: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border-info-row);
  }

  .description-text {
    word-break: break-word;
    text-align: justify;
    margin: 2px 0;
    line-height: 1.7;
    color: var(--color-info-content);
  }

  /* ---- Rich text inside descriptions (injected via v-html, needs :deep) ---- */
  .description-text :deep(a) {
    color: var(--color-link);
    text-decoration: none;
    font-weight: 500;
    cursor: pointer;
  }

  .description-text :deep(a:hover) {
    color: var(--color-link-hover);
    text-decoration: underline;
  }

  .description-text :deep(code) {
    padding: 1px 5px;
    border-radius: var(--radius-sm);
    background: var(--primary-tint);
    font-size: 0.9em;
  }

  .description-text :deep(blockquote) {
    margin: 4px 0;
    padding: 2px 12px;
    border-left: 3px solid var(--primary-tint-strong);
    color: var(--color-muted);
  }

  .description-text :deep(ul),
  .description-text :deep(ol) {
    margin: 4px 0;
    padding-left: 22px;
  }

  .description-text :deep(h1),
  .description-text :deep(h2),
  .description-text :deep(h3),
  .description-text :deep(h4),
  .description-text :deep(h5),
  .description-text :deep(h6) {
    margin: 8px 0 4px;
    line-height: 1.4;
  }

  .description-text :deep(img) {
    max-width: 100%;
    height: auto;
    border-radius: var(--radius-sm);
  }

  .description-text :deep(hr) {
    border: none;
    border-top: 1px solid var(--border-info-row);
    margin: 8px 0;
  }

  /* ---- Empty state ---- */
  .no-game-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: calc(100vh - 50px);
    color: var(--color-muted);
    font-size: 16px;
    user-select: none;
    cursor: default;
  }

  .no-game-text {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    opacity: 0.7;
  }

  .no-game-icon-circle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 96px;
    height: 96px;
    margin-bottom: 18px;
    border-radius: 50%;
    background: var(--primary-tint);
    color: var(--color-muted);
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