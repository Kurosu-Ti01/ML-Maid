<template>
  <div class="edit-view">
    <GameEditForm />
  </div>
</template>

<script setup lang="ts">
  import GameEditForm from '@/components/GameEditForm.vue'
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

  .edit-view {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
</style>
