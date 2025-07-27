<template>
  <el-scrollbar class="sidebar-container">
    <div class="sidebar-content">
      <div v-if="gameStore.isLoadingList" class="loading-container">
        <span>Loading games...</span>
      </div>
      <div v-else-if="gameStore.error" class="error-container">
        <span>Error: {{ gameStore.error }}</span>
      </div>
      <div v-else>
        <div v-for="game in gameStore.gamesForList" :key="game.uuid" class="game-item">
          <img :src="getIconFin(game.iconImage)" class="game-icon" alt="icon" />
          <span class="game-title">{{ game.title }}</span>
        </div>
      </div>
    </div>
  </el-scrollbar>
</template>

<script setup lang="ts" name="SideBarGameList">
  import { useGameStore } from '../stores/game'

  const gameStore = useGameStore()

  function getIconFin(imagePath: string) {
    if (!imagePath) {
      return '/images/icon.ico'; // default icon if no image path is provided
    }
    // Return cached 32x32 icon URL or default
    return imagePath || '/images/icon.ico';
  }
</script>

<style scoped>
  .sidebar-container {
    background: #f7f8fa;
  }

  .sidebar-content {
    flex: 1;
    padding: 16px 8px 16px 16px;
    box-sizing: border-box;
  }

  .game-item {
    display: flex;
    align-items: center;
    padding: 5px 0;
    border-bottom: 1px solid #e0e0e0;
    cursor: pointer;
    transition: background 0.2s;
  }

  .game-item:hover {
    background: #e9ecef;
    border-radius: 4px;
  }

  .game-icon {
    width: 32px;
    height: 32px;
    margin-right: 12px;
    border-radius: 8px;
    object-fit: cover;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  }

  .game-title {
    color: #222;
    font-size: 16px;
    font-weight: 500;
  }

  .sidebar-resizer {
    width: 6px;
    cursor: ew-resize;
    background: linear-gradient(to left, #f7f8fa 60%, #e0e0e0 100%);
    height: 100%;
    user-select: none;
  }

  .loading-container,
  .error-container {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
    color: #666;
    font-size: 14px;
  }

  .error-container {
    color: #d32f2f;
  }
</style>