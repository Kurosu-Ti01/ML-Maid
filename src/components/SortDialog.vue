<template>
  <el-dialog v-model="visible" title="Sort Games" width="400px" align-center class="sort-dialog">
    <el-form :model="form" label-width="80px">
      <el-form-item label="Sort By">
        <el-select v-model="form.sortBy" placeholder="Select">
          <el-option v-for="item in sortByOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="Order">
        <el-radio-group v-model="form.sortOrder">
          <el-radio-button v-for="item in sortOrderOptions" :key="item.value" :value="item.value" :label="item.value">
            {{ item.label }}
          </el-radio-button>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="visible = false">Cancel</el-button>
        <el-button type="primary" @click="save">
          Confirm
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
  import { ref, onMounted, onUnmounted } from 'vue'
  import { useSettingsStore } from '../stores/settings'
  import { storeToRefs } from 'pinia'

  const visible = ref(false)
  const settingsStore = useSettingsStore()
  const { settings } = storeToRefs(settingsStore)

  const sortByOptions = [
    { label: 'Name', value: 'name' },
    { label: 'Date Added', value: 'dateAdded' },
    { label: 'Last Played', value: 'lastPlayed' },
    { label: 'Score', value: 'score' },
  ]

  const sortOrderOptions = [
    { label: 'Ascending', value: 'ascending' },
    { label: 'Descending', value: 'descending' },
  ]

  const form = ref<{
    sortBy: 'name' | 'dateAdded' | 'lastPlayed' | 'score'
    sortOrder: 'ascending' | 'descending'
  }>({
    sortBy: 'name',
    sortOrder: 'ascending'
  })

  function open() {
    if (settings.value.sorting) {
      form.value = { ...settings.value.sorting }
    } else {
      form.value = { sortBy: 'name', sortOrder: 'ascending' }
    }
    visible.value = true
  }

  async function save() {
    const newSettings = JSON.parse(JSON.stringify(settings.value))
    newSettings.sorting = { ...form.value }

    await settingsStore.saveSettings(newSettings)
    visible.value = false
  }

  onMounted(() => {
    window.addEventListener('open-sort-dialog', open as EventListener)
  })

  onUnmounted(() => {
    window.removeEventListener('open-sort-dialog', open as EventListener)
  })
</script>


<style scoped>
  .sort-dialog {
    border-radius: 8px;
  }
</style>
