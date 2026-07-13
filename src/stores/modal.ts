import { defineStore } from 'pinia'
import { ref } from 'vue'

// In-app modal state for the add/edit game forms.
// Replaces the Electron child windows (#/add, #/edit hash routes).
export const useModalStore = defineStore('modal', () => {
  const addModalVisible = ref(false)
  const editModalVisible = ref(false)
  const editGameData = ref<gameData | null>(null)

  function openAddModal() {
    addModalVisible.value = true
  }

  function openEditModal(game: gameData) {
    editGameData.value = game
    editModalVisible.value = true
  }

  function closeAddModal() {
    addModalVisible.value = false
  }

  function closeEditModal() {
    editModalVisible.value = false
    editGameData.value = null
  }

  return {
    addModalVisible,
    editModalVisible,
    editGameData,
    openAddModal,
    openEditModal,
    closeAddModal,
    closeEditModal
  }
})
