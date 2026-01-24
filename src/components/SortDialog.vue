<template>
  <n-modal v-model:show="visible" preset="dialog" title="Sort Games" style="width: 400px;" class="sort-dialog">
    <n-form :model="form" label-width="80" label-placement="left">
      <n-form-item label="Sort By">
        <n-select v-model:value="form.sortBy" placeholder="Select" :options="sortByOptions" />
      </n-form-item>
      <n-form-item label="Order">
        <n-radio-group v-model:value="form.sortOrder">
          <n-radio-button v-for="item in sortOrderOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </n-radio-button>
        </n-radio-group>
      </n-form-item>
    </n-form>
    <template #action>
      <div class="dialog-footer">
        <n-button @click="visible = false">Cancel</n-button>
        <n-button type="primary" @click="save">
          Confirm
        </n-button>
      </div>
    </template>
  </n-modal>
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
