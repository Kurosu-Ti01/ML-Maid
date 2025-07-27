<template>
  <RouterView />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useGameStore } from './stores/game'

const gameStore = useGameStore()

onMounted(async () => {
  // Initialize games data when app starts
  await gameStore.initialize()
})
</script>

<style scoped></style>