<template>
  <div class="add-view">
    <GameAddForm />
  </div>
</template>

<script setup lang="ts">
  import GameAddForm from '@/components/GameAddForm.vue'
</script>

<style scoped>

  html,
  body {
    width: 100vw;
    height: 100vh;
    margin: 0 !important;
    padding: 0;
    overflow: hidden;
  }

  .add-view {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
</style>
