<template>
  <!-- Add game modal -->
  <n-modal v-model:show="addModalVisible" :mask-closable="false" :close-on-esc="false">
    <n-card class="game-form-card" :title="$t('titlebar.addGame')" :bordered="false" role="dialog">
      <GameAddForm @close="modalStore.closeAddModal()" />
    </n-card>
  </n-modal>

  <!-- Edit game modal -->
  <n-modal v-model:show="editModalVisible" :mask-closable="false" :close-on-esc="false">
    <n-card class="game-form-card" :title="$t('titlebar.editGame')" :bordered="false" role="dialog">
      <GameEditForm v-if="editGameData" :game="editGameData" @close="modalStore.closeEditModal()" />
    </n-card>
  </n-modal>
</template>

<script setup lang="ts">
  import { onMounted, onUnmounted } from 'vue'
  import { storeToRefs } from 'pinia'
  import GameAddForm from '@/components/GameAddForm.vue'
  import GameEditForm from '@/components/GameEditForm.vue'
  import { useModalStore } from '@/stores/modal'

  const modalStore = useModalStore()
  const { addModalVisible, editModalVisible, editGameData } = storeToRefs(modalStore)

  // The titlebar is plain DOM (built in main.ts), so it signals via a window
  // event — same pattern as the filter dialog
  function handleOpenAddGame() {
    modalStore.openAddModal()
  }

  onMounted(() => {
    window.addEventListener('open-add-game', handleOpenAddGame)
  })
  onUnmounted(() => {
    window.removeEventListener('open-add-game', handleOpenAddGame)
  })
</script>

<style scoped>
  .game-form-card {
    width: min(900px, 92vw);
    height: min(700px, 90vh);
    display: flex;
    flex-direction: column;
  }

  /* Compound selector outweighs Naive's runtime-injected .n-card rule */
  .game-form-card.n-card {
    border-radius: var(--radius-lg);
  }

  .game-form-card :deep(.n-card-header__main) {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 0.01em;
    color: var(--primary);
  }

  .game-form-card :deep(.n-card-header__main)::before {
    content: '';
    width: 4px;
    height: 1.1em;
    border-radius: 2px;
    background: linear-gradient(180deg, var(--primary-hover), var(--primary));
    flex-shrink: 0;
  }

  .game-form-card :deep(.n-card__content) {
    flex: 1;
    min-height: 0;
    padding: 0;
    overflow: hidden;
  }
</style>
