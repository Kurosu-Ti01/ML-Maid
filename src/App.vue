<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <n-message-provider>
      <n-dialog-provider>
        <RouterView />
        <SortDialog />
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
  import { onMounted } from 'vue'
  import { useGameStore } from './stores/game'
  import { useTheme } from '@/composables/useTheme'
  import SortDialog from '@/components/SortDialog.vue'
  import type { GlobalThemeOverrides } from 'naive-ui'

  const gameStore = useGameStore()
  const { } = useTheme() // Initialize theme system

  const themeOverrides: GlobalThemeOverrides = {
    common: {
      primaryColor: '#409eff',
      primaryColorHover: '#66b1ff',
      primaryColorPressed: '#3a8ee6',
      primaryColorSuppl: '#409eff',
      errorColor: '#ff6b6b',
      errorColorHover: '#ff8787',
      errorColorPressed: '#fa5252',
      errorColorSuppl: '#ff6b6b'
    }
  }

  onMounted(async () => {
    // Initialize games data when app starts
    await gameStore.initialize()
  })
</script>

<style>

  /* Global base styles */
  html,
  body {
    transition: background-color 0.3s ease, color 0.3s ease;
  }

  #app {
    height: 100vh;
    width: 100vw;
    overflow: hidden;
  }

  .n-config-provider,
  .n-message-provider,
  .n-dialog-provider {
    height: 100%;
  }
</style>