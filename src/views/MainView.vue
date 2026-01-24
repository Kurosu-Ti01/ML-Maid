<template>
  <div class="main-container">
    <div class="sidebar-nav-container">
      <SideBarNav />
    </div>
    <div class="main-content">
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
    </div>
  </div>
</template>

<script setup lang="ts">
  import SideBarNav from '@/components/SideBarNav.vue';
  import SideBarGameList from '@/components/SideBarGameList.vue';
  import MainAeraGameInfo from '@/components/MainAeraGameInfo.vue';
  import Statistics from '@/components/Statistics.vue';
  import Settings from '@/components/Settings.vue';
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
    background: var(--siderbar-nav-bg);
    padding: 4px;
    border-right: 1px solid var(--siderbar-nav-border);
    width: 50px;
    flex-shrink: 0;
  }

  .main-content {
    flex: 1;
    padding: 0;
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  /* Dark mode styles */
  :global(html.dark) .sidebar-nav-container {
    background: var(--el-bg-color);
    border-right-color: var(--el-border-color);
  }

  :global(html.dark) .main-content {
    background-color: var(--el-bg-color-page);
  }
</style>
