<template>
  <div class="sidebar-nav">
    <div class="top-buttons">
      <button class="icon-btn" :class="{ active: currentPage === 'list' }" @click="setPage('list')">
        <img src="/icons/list.svg" alt="icon" />
      </button>
      <button class="icon-btn" :class="{ active: currentPage === 'statistics' }" @click="setPage('statistics')">
        <img src="/icons/pie-chart.svg" alt="icon" />
      </button>
    </div>
    <div class="bottom-button">
      <button class="icon-btn" :class="{ active: currentPage === 'settings' }" @click="setPage('settings')">
        <img src="/icons/settings.svg" alt="icon" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts" name="SideBarNav">
  import { usePageStore, type PageType } from '@/stores/page'
  import { storeToRefs } from 'pinia'

  const pageStore = usePageStore()
  const { currentPage } = storeToRefs(pageStore)

  const setPage = (page: PageType) => {
    pageStore.setCurrentPage(page)
  }
</script>

<style scoped>
  .sidebar-nav {
    padding: 4px;
    margin-bottom: 4px;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    box-sizing: border-box;
  }

  .top-buttons {
    display: flex;
    flex-direction: column;
    gap: 18px;
    align-items: center;
  }

  .bottom-button {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .icon-btn {
    width: 40px;
    height: 40px;
    background: transparent;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    transition: background 0.2s;
  }

  .icon-btn:hover {
    background: #72aaff;
  }

  .icon-btn.active {
    background: #409EFF;
  }

  .icon-btn img {
    width: 28px;
    height: 28px;
    object-fit: contain;
    transition: filter 0.3s;
  }

  /* Dark mode: invert SVG colors */
  html.dark .icon-btn img {
    filter: invert(1);
  }
</style>