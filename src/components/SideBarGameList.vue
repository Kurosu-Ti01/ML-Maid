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
          <img :src="getIconFin(game.iconImageDisplay)" class="game-icon" alt="icon" />
          <span class="game-title">{{ game.title }}</span>
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

  function selectGame(uuid: string) {
    gameStore.currentGameUuid = uuid;
    gameStore.loadGameDetail(uuid)
  }
</script>

<style scoped>
  .sidebar-container {
    background: var(--sidebar-list-bg);
    height: 100%;
  }

  .sidebar-content {
    flex: 1;
    padding: 16px 8px 16px 16px;
    box-sizing: border-box;
  }

  .game-item {
    display: flex;
    align-items: center;
    padding: 5px 8px;
    border-bottom: 1px solid var(--game-item-border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: background-color var(--duration-fast) var(--ease-standard);
  }

  .game-item:hover {
    background: var(--primary-tint);
  }

  .game-item.selected {
    background: var(--primary-tint-strong);
  }

  .game-item.selected .game-title {
    color: var(--primary);
    font-weight: 600;
  }

  .game-icon {
    width: 32px;
    height: 32px;
    margin-right: 12px;
    object-fit: cover;
  }

  .game-title {
    font-size: 16px;
    font-weight: 500;
    color: var(--color-info-content);
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