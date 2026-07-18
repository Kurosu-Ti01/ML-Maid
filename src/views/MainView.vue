<template>
  <div class="main-container">
    <div class="sidebar-nav-container">
      <SideBarNav />
    </div>
    <div class="main-content">
      <Transition name="page-fade" mode="out-in">
        <!-- Main List -->
        <div v-if="currentPage === 'list'" class="list-page">
          <!-- Shared ambient wash behind both the game list and the detail pane -->
          <div class="list-ambient" :style="{ backgroundImage: `url('${ambientImage}')` }"></div>
          <n-split class="list-split" direction="horizontal" :default-size="0.25" :min="0.1" :max="0.4">
            <template #1>
              <SideBarGameList />
            </template>
            <template #2>
              <MainAeraGameInfo />
            </template>
          </n-split>
        </div>
        <!-- Statistics -->
        <Statistics v-else-if="currentPage === 'statistics'" />
        <!-- Settings -->
        <Settings v-else-if="currentPage === 'settings'" />
      </Transition>
    </div>

    <!-- In-app add/edit game modals -->
    <GameFormModals />
  </div>
</template>

<script setup lang="ts">
  import SideBarNav from '@/components/SideBarNav.vue';
  import SideBarGameList from '@/components/SideBarGameList.vue';
  import MainAeraGameInfo from '@/components/MainAeraGameInfo.vue';
  import Statistics from '@/components/Statistics.vue';
  import Settings from '@/components/Settings.vue';
  import GameFormModals from '@/components/GameFormModals.vue';
  import { usePageStore } from '@/stores/page';
  import { useGameStore } from '@/stores/game';
  import { storeToRefs } from 'pinia';
  import { computed } from 'vue';
  import defaultBackground from '/default/ML-Maid-Background.png';

  const pageStore = usePageStore();
  const { currentPage } = storeToRefs(pageStore);

  const gameStore = useGameStore();
  const { currentGameUuid, gameDetailsCache } = storeToRefs(gameStore);

  // Current game's key visual, shared as the ambient wash for the whole list page
  const ambientImage = computed(() => {
    const game = currentGameUuid.value ? gameDetailsCache.value.get(currentGameUuid.value) : null;
    return game?.backgroundImageDisplay || defaultBackground;
  });
</script>

<style scoped>
  .main-container {
    width: 100%;
    height: 100%;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    display: flex;
  }

  .sidebar-nav-container {
    background: var(--sidebar-nav-bg);
    padding: 4px;
    border-right: 1px solid var(--sidebar-nav-border);
    width: 50px;
    flex-shrink: 0;
  }

  .main-content {
    flex: 1;
    padding: 0;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    background: var(--bg-page);
  }

  /* Shared ambient wash for the whole list page (behind list + detail) */
  .list-page {
    position: relative;
    height: 100%;
    overflow: hidden;
  }

  .list-ambient {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center 25%;
    filter: var(--ambient-filter);
    transform: scale(1.2);
    opacity: var(--ambient-opacity);
    z-index: 0;
    pointer-events: none;
  }

  .list-split {
    position: relative;
    z-index: 1;
    height: 100%;
  }

  /* Let the shared ambient show through the split panes */
  .list-split :deep(.n-split-pane-1),
  .list-split :deep(.n-split-pane-2) {
    background-color: transparent;
  }

  /* Page switch fade */
  .page-fade-enter-active,
  .page-fade-leave-active {
    transition: opacity var(--duration-fast) var(--ease-standard);
  }

  .page-fade-enter-from,
  .page-fade-leave-to {
    opacity: 0;
  }
</style>
