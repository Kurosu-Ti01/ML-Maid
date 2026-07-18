<template>
  <n-scrollbar class="sidebar-container">
    <div class="sidebar-content">
      <div v-if="gameStore.isLoadingList" class="loading-container">
        <span>{{ $t('sidebar.loadingGames') }}</span>
      </div>
      <div v-else-if="gameStore.error" class="error-container">
        <span>{{ $t('sidebar.error', { message: gameStore.error }) }}</span>
      </div>
      <div v-else-if="!gameStore.gamesForList || gameStore.gamesForList.length === 0" class="no-games-container">
        <span>{{ $t('sidebar.noGames') }}</span>
      </div>
      <div v-else>
        <div v-for="game in gameStore.gamesForList" :key="game.uuid" class="game-item"
          :class="{ selected: game.uuid === gameStore.currentGameUuid }" @click="selectGame(game.uuid)">
          <img :src="getIconFin(game.iconImageDisplay)" class="game-thumb" alt="icon" />
          <div class="game-meta">
            <span class="game-title">{{ game.title }}</span>
            <span v-if="gameSubtitle(game)" class="game-sub">{{ gameSubtitle(game) }}</span>
          </div>
        </div>
      </div>
    </div>
  </n-scrollbar>
</template>

<script setup lang="ts" name="SideBarGameList">
  import { NScrollbar } from 'naive-ui'
  import { useGameStore } from '@/stores/game'
  import defaultIcon from '/default/ML-Maid-Icon-W.png'

  const gameStore = useGameStore()

  function getIconFin(imagePath: string) {
    if (!imagePath) {
      return defaultIcon; // default icon if no image path is provided
    }
    // Return the provided image path (an asset: URL produced by the api layer)
    return imagePath || defaultIcon;
  }

  // Secondary line under the title: prefer developer, fall back to last-played
  function gameSubtitle(game: GameListItem): string {
    if (game.developer && game.developer.length) return game.developer.join(' · ')
    if (game.lastPlayedDisplay) return game.lastPlayedDisplay
    return ''
  }

  function selectGame(uuid: string) {
    gameStore.currentGameUuid = uuid;
    gameStore.loadGameDetail(uuid)
  }
</script>

<style scoped>
  .sidebar-container {
    background: var(--glass-bg);
    height: 100%;
  }

  .sidebar-content {
    flex: 1;
    padding: 8px;
    box-sizing: border-box;
  }

  .game-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px 8px;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background-color var(--duration-fast) var(--ease-standard);
  }

  .game-item + .game-item {
    margin-top: 1px;
  }

  .game-item:hover {
    background: var(--primary-tint);
  }

  .game-item.selected {
    background: var(--primary-tint-strong);
  }

  .game-thumb {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-sm);
    object-fit: cover;
    flex-shrink: 0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.14);
  }

  .game-meta {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
    gap: 1px;
  }

  .game-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-info-content);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .game-item.selected .game-title {
    color: var(--primary);
  }

  .game-sub {
    font-size: 12px;
    color: var(--color-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .loading-container,
  .error-container,
  .no-games-container {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
    color: var(--color-muted);
    font-size: 14px;
  }

  .error-container {
    color: var(--color-danger);
  }

  .no-games-container {
    color: var(--color-muted-dark);
    font-style: italic;
  }
</style>
