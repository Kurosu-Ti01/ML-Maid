<template>
  <RouterView />
</template>

<script setup lang="ts">
  import { onMounted } from 'vue'
  import { useGameStore } from './stores/game'
  import { useTheme } from '@/composables/useTheme'

  const gameStore = useGameStore()
  const { } = useTheme() // Initialize theme system

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
</style>