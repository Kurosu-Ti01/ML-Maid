<template>
  <el-scrollbar class="sidebar-container">
    <div class="sidebar-content">
      <div v-for="game in games" :key="game.id" class="game-item">
        <img :src="game.icon" class="game-icon" alt="icon" />
        <span class="game-title">{{ game.title }}</span>
      </div>
    </div>
  </el-scrollbar>
</template>

<script setup lang="ts" name="SideBarGameList">
  import { ref } from 'vue';

  const games = ref([
    { id: 1, icon: 'https://cdn-icons-png.flaticon.com/512/616/616554.png', title: 'Game One' },
    { id: 2, icon: 'https://cdn-icons-png.flaticon.com/512/616/616555.png', title: 'Game Two' },
    { id: 3, icon: 'https://cdn-icons-png.flaticon.com/512/616/616556.png', title: 'Game Three' },
    { id: 4, icon: 'https://cdn-icons-png.flaticon.com/512/616/616557.png', title: 'Game Four' },
    { id: 5, icon: 'https://cdn-icons-png.flaticon.com/512/616/616558.png', title: 'Game Five' },
    { id: 6, icon: 'https://cdn-icons-png.flaticon.com/512/616/616559.png', title: 'Game Six' },
    { id: 7, icon: 'https://cdn-icons-png.flaticon.com/512/616/616560.png', title: 'Game Seven' },
    { id: 8, icon: 'https://cdn-icons-png.flaticon.com/512/616/616561.png', title: 'Game Eight' },
    { id: 9, icon: 'https://cdn-icons-png.flaticon.com/512/616/616562.png', title: 'Game Nine' },
    { id: 10, icon: 'https://cdn-icons-png.flaticon.com/512/616/616563.png', title: 'Game Ten' },
    { id: 11, icon: 'https://cdn-icons-png.flaticon.com/512/616/616564.png', title: 'Game Eleven' },
    { id: 12, icon: 'https://cdn-icons-png.flaticon.com/512/616/616565.png', title: 'Game Twelve' },
    { id: 13, icon: 'https://cdn-icons-png.flaticon.com/512/616/616566.png', title: 'Game Thirteen' },
    { id: 14, icon: 'https://cdn-icons-png.flaticon.com/512/616/616567.png', title: 'Game Fourteen' },
    { id: 15, icon: 'https://cdn-icons-png.flaticon.com/512/616/616568.png', title: 'Game Fifteen' },
    { id: 16, icon: 'https://cdn-icons-png.flaticon.com/512/616/616569.png', title: 'Game Sixteen' },
    { id: 17, icon: 'https://cdn-icons-png.flaticon.com/512/616/616570.png', title: 'Game Seventeen' },
    { id: 18, icon: 'https://cdn-icons-png.flaticon.com/512/616/616571.png', title: 'Game Eighteen' },
    { id: 19, icon: 'https://cdn-icons-png.flaticon.com/512/616/616572.png', title: 'Game Nineteen' },
    { id: 20, icon: 'https://cdn-icons-png.flaticon.com/512/616/616574.png', title: 'Game Twenty' },
    { id: 21, icon: 'https://cdn-icons-png.flaticon.com/512/616/616575.png', title: 'Game Twenty-One' },
    // 可继续添加更多游戏
  ]);
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
</style>