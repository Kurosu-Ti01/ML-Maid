<template>
  <n-modal v-model:show="visible" preset="dialog" title="Filter and Sort Games" style="width: 600px;"
    class="filter-dialog">
    <n-form :model="form" label-width="100" label-placement="left">
      <!-- Filter Section -->
      <n-divider title-placement="left">Filter Options</n-divider>

      <!-- Genre Filter -->
      <n-form-item label="Genre">
        <n-dynamic-tags v-model:value="form.filtering.genres"
          :render-tag="(tag: string, index: number) => renderTag(tag, index, 'genres')"
          @create="(label: string) => handleCreate(label, 'genres')">
          <template #input="{ submit, deactivate }">
            <n-auto-complete ref="genreInputRef" v-model:value="genreInput" :options="genreOptions"
              :loading="loadingGenres" placeholder="Type to search genres..."
              @select="(value: string) => handleSelect(value, 'genres', submit)" @blur="deactivate"
              @keyup.enter="handleEnterKey($event, 'genres', submit)" />
          </template>
          <template #trigger="{ activate, disabled }">
            <n-button size="small" type="primary" dashed :disabled="disabled"
              @click="() => { activate(); nextTick(() => genreInputRef?.focus()) }">
              <template #icon>
                <n-icon>
                  <AddIcon />
                </n-icon>
              </template>
              Add Genre
            </n-button>
          </template>
        </n-dynamic-tags>
      </n-form-item>

      <!-- Developer Filter -->
      <n-form-item label="Developer">
        <n-dynamic-tags v-model:value="form.filtering.developers"
          :render-tag="(tag: string, index: number) => renderTag(tag, index, 'developers')"
          @create="(label: string) => handleCreate(label, 'developers')">
          <template #input="{ submit, deactivate }">
            <n-auto-complete ref="developerInputRef" v-model:value="developerInput" :options="developerOptions"
              :loading="loadingDevelopers" placeholder="Type to search developers..."
              @select="(value: string) => handleSelect(value, 'developers', submit)" @blur="deactivate"
              @keyup.enter="handleEnterKey($event, 'developers', submit)" />
          </template>
          <template #trigger="{ activate, disabled }">
            <n-button size="small" type="primary" dashed :disabled="disabled"
              @click="() => { activate(); nextTick(() => developerInputRef?.focus()) }">
              <template #icon>
                <n-icon>
                  <AddIcon />
                </n-icon>
              </template>
              Add Developer
            </n-button>
          </template>
        </n-dynamic-tags>
      </n-form-item>

      <!-- Publisher Filter -->
      <n-form-item label="Publisher">
        <n-dynamic-tags v-model:value="form.filtering.publishers"
          :render-tag="(tag: string, index: number) => renderTag(tag, index, 'publishers')"
          @create="(label: string) => handleCreate(label, 'publishers')">
          <template #input="{ submit, deactivate }">
            <n-auto-complete ref="publisherInputRef" v-model:value="publisherInput" :options="publisherOptions"
              :loading="loadingPublishers" placeholder="Type to search publishers..."
              @select="(value: string) => handleSelect(value, 'publishers', submit)" @blur="deactivate"
              @keyup.enter="handleEnterKey($event, 'publishers', submit)" />
          </template>
          <template #trigger="{ activate, disabled }">
            <n-button size="small" type="primary" dashed :disabled="disabled"
              @click="() => { activate(); nextTick(() => publisherInputRef?.focus()) }">
              <template #icon>
                <n-icon>
                  <AddIcon />
                </n-icon>
              </template>
              Add Publisher
            </n-button>
          </template>
        </n-dynamic-tags>
      </n-form-item>

      <!-- Tags Filter -->
      <n-form-item label="Tags">
        <n-dynamic-tags v-model:value="form.filtering.tags"
          :render-tag="(tag: string, index: number) => renderTag(tag, index, 'tags')"
          @create="(label: string) => handleCreate(label, 'tags')">
          <template #input="{ submit, deactivate }">
            <n-auto-complete ref="tagInputRef" v-model:value="tagInput" :options="tagOptions" :loading="loadingTags"
              placeholder="Type to search tags..." @select="(value: string) => handleSelect(value, 'tags', submit)"
              @blur="deactivate" @keyup.enter="handleEnterKey($event, 'tags', submit)" />
          </template>
          <template #trigger="{ activate, disabled }">
            <n-button size="small" type="primary" dashed :disabled="disabled"
              @click="() => { activate(); nextTick(() => tagInputRef?.focus()) }">
              <template #icon>
                <n-icon>
                  <AddIcon />
                </n-icon>
              </template>
              Add Tag
            </n-button>
          </template>
        </n-dynamic-tags>
      </n-form-item>

      <!-- Sort Section -->
      <n-divider title-placement="left">Sort Options</n-divider>

      <n-form-item label="Sort By">
        <n-select v-model:value="form.sorting.sortBy" placeholder="Select" :options="sortByOptions" />
      </n-form-item>
      <n-form-item label="Order">
        <n-radio-group v-model:value="form.sorting.sortOrder">
          <n-radio-button v-for="item in sortOrderOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </n-radio-button>
        </n-radio-group>
      </n-form-item>
    </n-form>
    <template #action>
      <div class="dialog-footer">
        <n-button @click="resetFilters">Reset Filters</n-button>
        <div style="display: flex; gap: 8px;">
          <n-button @click="visible = false">Cancel</n-button>
          <n-button type="primary" @click="save">
            Confirm
          </n-button>
        </div>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
  import { ref, computed, h, onMounted, onUnmounted, toRaw, nextTick } from 'vue'
  import { useSettingsStore } from '../stores/settings'
  import { useMessage, NTag, NIcon } from 'naive-ui'
  import { AddFilled as AddIcon } from '@vicons/material'
  import { storeToRefs } from 'pinia'

  const message = useMessage()
  const visible = ref(false)
  const settingsStore = useSettingsStore()
  const { settings } = storeToRefs(settingsStore)

  // Input values for autocomplete
  const genreInput = ref('')
  const developerInput = ref('')
  const publisherInput = ref('')
  const tagInput = ref('')

  // Refs for input components to focus
  const genreInputRef = ref()
  const developerInputRef = ref()
  const publisherInputRef = ref()
  const tagInputRef = ref()

  // Loading states
  const loadingGenres = ref(false)
  const loadingDevelopers = ref(false)
  const loadingPublishers = ref(false)
  const loadingTags = ref(false)

  // All available metadata from database
  const allGenres = ref<string[]>([])
  const allDevelopers = ref<string[]>([])
  const allPublishers = ref<string[]>([])
  const allTags = ref<string[]>([])

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
    filtering: {
      genres: string[]
      developers: string[]
      publishers: string[]
      tags: string[]
    }
    sorting: {
      sortBy: 'name' | 'dateAdded' | 'lastPlayed' | 'score'
      sortOrder: 'ascending' | 'descending'
    }
  }>({
    filtering: {
      genres: [],
      developers: [],
      publishers: [],
      tags: []
    },
    sorting: {
      sortBy: 'name',
      sortOrder: 'ascending'
    }
  })

  // Computed autocomplete options
  const genreOptions = computed(() => {
    if (!genreInput.value) return allGenres.value.map(name => ({ label: name, value: name }))
    const searchLower = genreInput.value.toLowerCase()
    return allGenres.value
      .filter(name => name.toLowerCase().includes(searchLower))
      .map(name => ({ label: name, value: name }))
  })

  const developerOptions = computed(() => {
    if (!developerInput.value) return allDevelopers.value.map(name => ({ label: name, value: name }))
    const searchLower = developerInput.value.toLowerCase()
    return allDevelopers.value
      .filter(name => name.toLowerCase().includes(searchLower))
      .map(name => ({ label: name, value: name }))
  })

  const publisherOptions = computed(() => {
    if (!publisherInput.value) return allPublishers.value.map(name => ({ label: name, value: name }))
    const searchLower = publisherInput.value.toLowerCase()
    return allPublishers.value
      .filter(name => name.toLowerCase().includes(searchLower))
      .map(name => ({ label: name, value: name }))
  })

  const tagOptions = computed(() => {
    if (!tagInput.value) return allTags.value.map(name => ({ label: name, value: name }))
    const searchLower = tagInput.value.toLowerCase()
    return allTags.value
      .filter(name => name.toLowerCase().includes(searchLower))
      .map(name => ({ label: name, value: name }))
  })

  // Custom tag renderer with proper colors and close functionality
  function renderTag(tag: string, index: number, type: 'genres' | 'developers' | 'publishers' | 'tags') {
    return h(
      NTag,
      {
        type: 'info',
        closable: true,
        onClose: () => {
          // Manually remove the tag from the array
          form.value.filtering[type].splice(index, 1)
        }
      },
      { default: () => tag }
    )
  }

  // Fetch metadata from backend
  async function fetchMetadata() {
    try {
      if (window.electronAPI?.getAllGenres &&
        window.electronAPI?.getAllDevelopers &&
        window.electronAPI?.getAllPublishers &&
        window.electronAPI?.getAllTags) {
        // Fetch all metadata from database
        const [genres, developers, publishers, tags] = await Promise.all([
          window.electronAPI.getAllGenres(),
          window.electronAPI.getAllDevelopers(),
          window.electronAPI.getAllPublishers(),
          window.electronAPI.getAllTags()
        ])

        allGenres.value = genres || []
        allDevelopers.value = developers || []
        allPublishers.value = publishers || []
        allTags.value = tags || []

        console.log('Metadata loaded:', {
          genres: genres.length,
          developers: developers.length,
          publishers: publishers.length,
          tags: tags.length
        })
      } else {
        console.warn('Metadata API not available')
        allGenres.value = []
        allDevelopers.value = []
        allPublishers.value = []
        allTags.value = []
      }
    } catch (error) {
      console.error('Failed to fetch metadata:', error)
      message.error('Failed to load filter options')
      // Use fallback data on error
      allGenres.value = []
      allDevelopers.value = []
      allPublishers.value = []
      allTags.value = []
    }
  }

  // Handle autocomplete selection
  function handleSelect(value: string, type: 'genres' | 'developers' | 'publishers' | 'tags', submit: (value: string) => void) {
    submit(value)
    // Clear input after selection
    clearInput(type)
  }

  // Handle Enter key press
  function handleEnterKey(
    event: KeyboardEvent,
    type: 'genres' | 'developers' | 'publishers' | 'tags',
    submit: (value: string) => void
  ) {
    const target = event.target as HTMLInputElement
    const value = target.value.trim()

    if (!value) return

    const allValues = getAllValuesByType(type)

    // Check if the value exists in database
    if (!allValues.includes(value)) {
      message.warning(`"${value}" does not exist in the database`)
      return
    }

    // Check if already added
    if (form.value.filtering[type].includes(value)) {
      message.warning(`"${value}" is already added`)
      return
    }

    submit(value)
    clearInput(type)
  }

  // Handle tag creation (manual add)
  function handleCreate(label: string, type: 'genres' | 'developers' | 'publishers' | 'tags'): string | false {
    const trimmed = label.trim()

    if (!trimmed) {
      return false
    }

    const allValues = getAllValuesByType(type)

    // Check if exists in database
    if (!allValues.includes(trimmed)) {
      message.warning(`"${trimmed}" does not exist in the database`)
      return false
    }

    // Check if already added
    if (form.value.filtering[type].includes(trimmed)) {
      message.warning(`"${trimmed}" is already added`)
      return false
    }

    clearInput(type)
    return trimmed  // Return the actual value to be added as a tag
  }

  function getAllValuesByType(type: 'genres' | 'developers' | 'publishers' | 'tags'): string[] {
    switch (type) {
      case 'genres': return allGenres.value
      case 'developers': return allDevelopers.value
      case 'publishers': return allPublishers.value
      case 'tags': return allTags.value
      default: return []
    }
  }

  function clearInput(type: 'genres' | 'developers' | 'publishers' | 'tags') {
    switch (type) {
      case 'genres': genreInput.value = ''; break
      case 'developers': developerInput.value = ''; break
      case 'publishers': publisherInput.value = ''; break
      case 'tags': tagInput.value = ''; break
    }
  }

  function resetFilters() {
    form.value.filtering = {
      genres: [],
      developers: [],
      publishers: [],
      tags: []
    }
    message.success('Filters cleared')
  }

  async function open() {
    // Load current settings
    if (settings.value.filtering) {
      form.value.filtering = { ...settings.value.filtering }
    } else {
      form.value.filtering = {
        genres: [],
        developers: [],
        publishers: [],
        tags: []
      }
    }

    if (settings.value.sorting) {
      form.value.sorting = { ...settings.value.sorting }
    } else {
      form.value.sorting = { sortBy: 'name', sortOrder: 'ascending' }
    }

    // Fetch latest metadata
    await fetchMetadata()

    visible.value = true
  }

  async function save() {
    // Create a plain object from the current settings to avoid reactive object issues
    const currentSettings = toRaw(settings.value)

    const newSettings: Settings = {
      general: { ...currentSettings.general },
      sorting: { ...form.value.sorting },
      filtering: {
        genres: [...form.value.filtering.genres],
        developers: [...form.value.filtering.developers],
        publishers: [...form.value.filtering.publishers],
        tags: [...form.value.filtering.tags]
      }
    }

    await settingsStore.saveSettings(newSettings)

    const filterCount =
      form.value.filtering.genres.length +
      form.value.filtering.developers.length +
      form.value.filtering.publishers.length +
      form.value.filtering.tags.length

    if (filterCount > 0) {
      message.success(`Filters and sorting saved (${filterCount} filters active)`)
    } else {
      message.success('Sorting preferences saved')
    }

    // Trigger event to update titlebar filter button
    window.dispatchEvent(new CustomEvent('filters-updated'))

    visible.value = false
  }

  onMounted(() => {
    window.addEventListener('open-filter-dialog', open as EventListener)
    // Also support legacy sort dialog event
    window.addEventListener('open-sort-dialog', open as EventListener)
  })

  onUnmounted(() => {
    window.removeEventListener('open-filter-dialog', open as EventListener)
    window.removeEventListener('open-sort-dialog', open as EventListener)
  })
</script>

<style scoped>
  .filter-dialog {
    border-radius: 8px;
  }

  .dialog-footer {
    display: flex;
    justify-content: space-between;
    width: 100%;
  }

  :deep(.n-dynamic-tags) {
    width: 100%;
  }

  :deep(.n-form-item-blank) {
    width: 100%;
  }
</style>
