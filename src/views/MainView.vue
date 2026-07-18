<template>
  <div class="main-container">
    <div class="sidebar-nav-container">
      <SideBarNav />
    </div>
    <div class="main-content">
      <Transition name="page-fade" mode="out-in">
        <!-- Main List -->
        <n-split v-if="currentPage === 'list'" direction="horizontal" :default-size="0.25" :min="0.1" :max="0.4"
          style="height: 100%">
          <template #1>
            <SideBarGameList />
          </template>
          <template #2>
            <MainAeraGameInfo />
          </template>
        </n-split>
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
  import { storeToRefs } from 'pinia';

  const pageStore = usePageStore();
  const { currentPage } = storeToRefs(pageStore);
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
