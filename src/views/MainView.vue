<template>
  <el-container>
    <el-aside>
      <SideBarNav />
    </el-aside>
    <el-main>
      <!-- Main List -->
      <el-splitter v-if="currentPage === 'list'">
        <el-splitter-panel size="25%" min="10%" max="40%">
          <SideBarGameList />
        </el-splitter-panel>
        <el-splitter-panel>
          <MainAeraGameInfo />
        </el-splitter-panel>
      </el-splitter>
      <!-- Statistics -->
      <Statistics v-else-if="currentPage === 'statistics'" />
      <!-- Settings -->
      <Settings v-else-if="currentPage === 'settings'" />
    </el-main>
  </el-container>
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
  .el-container {
    width: 100%;
    height: 100%;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
  }

  .el-aside {
    background: var(--siderbar-nav-bg);
    padding: 12px;
    border-right: 1px solid var(--siderbar-nav-border);
    width: 50px;
  }

  .el-main {
    padding: 0;
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  /* Dark mode styles */
  :global(html.dark) .el-aside {
    background: var(--el-bg-color);
    border-right-color: var(--el-border-color);
  }

  :global(html.dark) .el-main {
    background-color: var(--el-bg-color-page);
  }
</style>
