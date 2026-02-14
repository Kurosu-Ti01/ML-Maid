<template>
  <div class="edit-container">
    <!-- Tab Navigation -->
    <n-tabs v-model:value="activeTab" class="tabs-container" type="line">
      <!-- General Tab -->
      <n-tab-pane name="general" :tab="$t('gameForm.tabs.general')">
        <n-scrollbar class="tab-scrollbar">
          <n-form :model="gameForm" label-width="120" class="tab-form">
            <n-form-item :label="$t('gameForm.fields.title')">
              <n-input v-model:value="gameForm.title" :placeholder="$t('gameForm.placeholders.title')" />
            </n-form-item>

            <n-form-item :label="$t('gameForm.fields.genre')">
              <n-select ref="genreSelectRef" v-model:value="gameForm.genre" filterable multiple tag
                :options="genreOptions" :placeholder="$t('gameForm.placeholders.genre')" :loading="loadingGenres"
                :render-tag="renderTag" :show-arrow="false"
                @create="(label: string) => handleCreateTag(label, 'genre')" />
            </n-form-item>

            <n-form-item :label="$t('gameForm.fields.developer')">
              <n-select ref="developerSelectRef" v-model:value="gameForm.developer" filterable multiple tag
                :options="developerOptions" :placeholder="$t('gameForm.placeholders.developer')"
                :loading="loadingDevelopers" :render-tag="renderTag" :show-arrow="false"
                @create="(label: string) => handleCreateTag(label, 'developer')" />
            </n-form-item>

            <n-form-item :label="$t('gameForm.fields.publisher')">
              <n-select ref="publisherSelectRef" v-model:value="gameForm.publisher" filterable multiple tag
                :options="publisherOptions" :placeholder="$t('gameForm.placeholders.publisher')"
                :loading="loadingPublishers" :render-tag="renderTag" :show-arrow="false"
                @create="(label: string) => handleCreateTag(label, 'publisher')" />
            </n-form-item>

            <n-form-item :label="$t('gameForm.fields.releaseDate')">
              <n-date-picker v-model:value="gameForm.releaseDate" :placeholder="$t('gameForm.placeholders.releaseDate')"
                type="date" style="width: 100%;" />
            </n-form-item>

            <!-- Community Score and User Score in one row -->
            <n-grid :cols="2" :x-gap="20">
              <n-gi>
                <n-form-item :label="$t('gameForm.fields.communityScore')">
                  <n-input-number v-model:value="gameForm.communityScore"
                    :placeholder="$t('gameForm.placeholders.communityScore')" :min="0" :max="100"
                    style="width: 100%;" />
                </n-form-item>
              </n-gi>
              <n-gi>
                <n-form-item :label="$t('gameForm.fields.userScore')">
                  <n-input-number v-model:value="gameForm.personalScore"
                    :placeholder="$t('gameForm.placeholders.userScore')" :min="0" :max="100" style="width: 100%;" />
                </n-form-item>
              </n-gi>
            </n-grid>

            <n-form-item :label="$t('gameForm.fields.tags')">
              <n-select ref="tagSelectRef" v-model:value="gameForm.tags" filterable multiple tag :options="tagOptions"
                :placeholder="$t('gameForm.placeholders.tags')" :loading="loadingTags" :render-tag="renderTag"
                :show-arrow="false" @create="(label: string) => handleCreateTag(label, 'tag')" />
            </n-form-item>

            <n-form-item :label="$t('gameForm.fields.description')">
              <n-input v-model:value="descriptionInput" type="textarea" :rows="8"
                :placeholder="$t('gameForm.placeholders.description')" :autosize="{ minRows: 6, maxRows: 12 }" />
            </n-form-item>
          </n-form>
        </n-scrollbar>
      </n-tab-pane>

      <!-- Advanced Tab -->
      <n-tab-pane name="advanced" :tab="$t('gameForm.tabs.advanced')">
        <n-scrollbar class="tab-scrollbar">
          <n-form :model="gameForm" label-width="120" class="tab-form">
            <n-form-item :label="$t('gameForm.fields.uuid')">
              <n-input v-model:value="gameForm.uuid" :placeholder="$t('gameForm.placeholders.uuid')" disabled />
            </n-form-item>

            <n-form-item :label="$t('gameForm.fields.installPath')">
              <div class="install-path-input">
                <n-input v-model:value="gameForm.workingDir" :placeholder="$t('gameForm.placeholders.installPath')" />
                <n-button @click="selectworkingDir" style="margin-left: 8px;">
                  {{ $t('gameForm.buttons.browse') }}
                </n-button>
              </div>
            </n-form-item>

            <!-- Install Size and Time Played in one row -->
            <n-grid :cols="2" :x-gap="20">
              <n-gi>
                <n-form-item :label="$t('gameForm.fields.installSize')">
                  <n-input-number v-model:value="gameForm.folderSize"
                    :placeholder="$t('gameForm.placeholders.installSize')" :min="0" style="width: 100%;" />
                </n-form-item>
              </n-gi>
              <n-gi>
                <n-form-item :label="$t('gameForm.fields.timePlayed')">
                  <n-input-number v-model:value="gameForm.timePlayed"
                    :placeholder="$t('gameForm.placeholders.timePlayed')" :min="0" style="width: 100%;" />
                </n-form-item>
              </n-gi>
            </n-grid>

            <n-form-item :label="$t('gameForm.fields.lastPlayed')">
              <n-date-picker v-model:value="gameForm.lastPlayed" type="datetime"
                :placeholder="$t('gameForm.placeholders.lastPlayed')" style="width: 100%;"
                :is-date-disabled="() => false" />
            </n-form-item>

            <n-form-item :label="$t('gameForm.fields.monitorMode')">
              <div style="display: flex; align-items: center; gap: 8px; width: 100%;">
                <n-select v-model:value="gameForm.procMonMode" :placeholder="$t('gameForm.placeholders.monitorMode')"
                  style="width: calc(100% - 32px);" :options="procMonModeOptions" />
                <n-tooltip trigger="hover" placement="top">
                  <template #trigger>
                    <n-icon size="24" style="color: #909399; cursor: help; flex-shrink: 0;">
                      <InfoOutlined />
                    </n-icon>
                  </template>
                  <div style="max-width: 280px; line-height: 1.5;" v-html="$t('gameForm.tooltip.monitorMode')"></div>
                </n-tooltip>
              </div>
            </n-form-item>

            <!-- Process Names - Only show when Process Monitor is selected -->
            <n-form-item v-if="gameForm.procMonMode === PROC_MON_MODE.PROCESS"
              :label="$t('gameForm.fields.processNames')">
              <div class="process-names-container">
                <div class="process-names-header">
                  <span class="hint-text">{{ $t('gameForm.sections.processNamesHint') }}</span>
                  <n-button type="primary" size="small" @click="addProcessName">
                    <template #icon>
                      <n-icon>
                        <component :is="AddFilled" />
                      </n-icon>
                    </template>
                    {{ $t('gameForm.buttons.addProcess') }}
                  </n-button>
                </div>

                <div v-if="gameForm.procNames && gameForm.procNames.length > 0" class="process-names-list">
                  <div v-for="(_, index) in gameForm.procNames" :key="index" class="process-name-item">
                    <n-input v-model:value="gameForm.procNames[index]"
                      :placeholder="$t('gameForm.placeholders.processName')" style="flex: 1;" />
                    <n-button type="error" size="small" @click="removeProcessName(index)" style="margin-left: 8px;">
                      <template #icon>
                        <n-icon>
                          <component :is="DeleteOutlined" />
                        </n-icon>
                      </template>
                    </n-button>
                  </div>
                </div>

                <div v-else class="no-process-names">
                  <p class="hint-text">{{ $t('gameForm.empty.processNames') }}</p>
                </div>
              </div>
            </n-form-item>
          </n-form>
        </n-scrollbar>
      </n-tab-pane>

      <!-- Media Tab -->
      <n-tab-pane name="media" :tab="$t('gameForm.tabs.media')">
        <n-scrollbar class="tab-scrollbar">
          <div class="media-container">
            <!-- Left Column -->
            <div class="media-column left-column">
              <!-- Icon Section -->
              <div class="media-section">
                <div class="section-header">
                  <span class="section-title">{{ $t('gameForm.media.icon') }}</span>
                  <div class="title-underline"></div>
                </div>
                <div class="image-display-area icon-area" :class="{ 'has-image': iconPreview }">
                  <img v-if="iconPreview" :src="iconPreview" alt="Icon Preview" class="image-preview icon-preview" />
                  <span v-else class="placeholder-text">{{ $t('gameForm.media.noIcon') }}</span>
                </div>
                <div class="action-buttons">
                  <button class="action-btn" :title="$t('gameForm.media.selectFromPath')"
                    @click="selectImageFromPath('icon')">
                    <n-icon size="20">
                      <component :is="FolderOpenOutlined" />
                    </n-icon>
                  </button>
                  <button class="action-btn" :title="$t('gameForm.media.addFromUrl')">
                    <n-icon size="20">
                      <component :is="LinkOutlined" />
                    </n-icon>
                  </button>
                  <button class="action-btn" :title="$t('gameForm.media.remove')" @click="removeImage('icon')">
                    <n-icon size="20">
                      <component :is="DeleteOutlined" />
                    </n-icon>
                  </button>
                </div>
              </div>

              <!-- Background Section -->
              <div class="media-section">
                <div class="section-header">
                  <span class="section-title">{{ $t('gameForm.media.background') }}</span>
                  <div class="title-underline"></div>
                </div>
                <div class="image-display-area background-area" :class="{ 'has-image': backgroundPreview }">
                  <img v-if="backgroundPreview" :src="backgroundPreview" alt="Background Preview"
                    class="image-preview background-preview" />
                  <span v-else class="placeholder-text">{{ $t('gameForm.media.noBackground') }}</span>
                </div>
                <div class="action-buttons">
                  <button class="action-btn" :title="$t('gameForm.media.selectFromPath')"
                    @click="selectImageFromPath('background')">
                    <n-icon size="20">
                      <component :is="FolderOpenOutlined" />
                    </n-icon>
                  </button>
                  <button class="action-btn" :title="$t('gameForm.media.addFromUrl')">
                    <n-icon size="20">
                      <component :is="LinkOutlined" />
                    </n-icon>
                  </button>
                  <button class="action-btn" :title="$t('gameForm.media.remove')" @click="removeImage('background')">
                    <n-icon size="20">
                      <component :is="DeleteOutlined" />
                    </n-icon>
                  </button>
                </div>
              </div>
            </div>

            <!-- Right Column -->
            <div class="media-column right-column">
              <!-- Cover Section -->
              <div class="media-section full-height">
                <div class="section-header">
                  <span class="section-title">{{ $t('gameForm.media.cover') }}</span>
                  <div class="title-underline"></div>
                </div>
                <div class="image-display-area cover-area" :class="{ 'has-image': coverPreview }">
                  <img v-if="coverPreview" :src="coverPreview" alt="Cover Preview"
                    class="image-preview cover-preview" />
                  <span v-else class="placeholder-text">{{ $t('gameForm.media.noCover') }}</span>
                </div>
                <div class="action-buttons">
                  <button class="action-btn" :title="$t('gameForm.media.selectFromPath')"
                    @click="selectImageFromPath('cover')">
                    <n-icon size="20">
                      <component :is="FolderOpenOutlined" />
                    </n-icon>
                  </button>
                  <button class="action-btn" :title="$t('gameForm.media.addFromUrl')">
                    <n-icon size="20">
                      <component :is="LinkOutlined" />
                    </n-icon>
                  </button>
                  <button class="action-btn" :title="$t('gameForm.media.remove')" @click="removeImage('cover')">
                    <n-icon size="20">
                      <component :is="DeleteOutlined" />
                    </n-icon>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </n-scrollbar>
      </n-tab-pane>

      <!-- Links Tab -->
      <n-tab-pane name="links" :tab="$t('gameForm.tabs.links')">
        <n-scrollbar class="tab-scrollbar">
          <n-form :model="gameForm" label-width="120" class="tab-form">
            <div class="links-container">
              <div class="links-header">
                <h3>{{ $t('gameForm.sections.gameLinks') }}</h3>
                <n-button type="primary" @click="addLink">
                  <template #icon>
                    <n-icon>
                      <component :is="AddFilled" />
                    </n-icon>
                  </template>
                  {{ $t('gameForm.buttons.addLink') }}
                </n-button>
              </div>

              <div v-if="gameForm.links && gameForm.links.length > 0" class="links-list">
                <div v-for="(link, index) in gameForm.links" :key="index" class="link-item">
                  <div class="link-header">
                    <div class="link-index">{{ index + 1 }}</div>
                    <n-button type="error" size="small" circle @click="removeLink(index)">
                      <template #icon>
                        <n-icon>
                          <component :is="DeleteOutlined" />
                        </n-icon>
                      </template>
                    </n-button>
                  </div>

                  <n-form-item :label="$t('gameForm.fields.linkName')" :path="`links.${index}.name`">
                    <n-input v-model:value="link.name" :placeholder="$t('gameForm.placeholders.linkName')" />
                  </n-form-item>

                  <n-form-item :label="$t('gameForm.fields.linkUrl')" :path="`links.${index}.url`">
                    <n-input v-model:value="link.url" :placeholder="$t('gameForm.placeholders.linkUrl')" />
                  </n-form-item>
                </div>
              </div>

              <div v-else class="no-links">
                <p>{{ $t('gameForm.empty.noLinks') }}</p>
                <p class="hint-text">{{ $t('gameForm.empty.addLinksHint') }}</p>
              </div>
            </div>
          </n-form>
        </n-scrollbar>
      </n-tab-pane>

      <!-- Actions Tab -->
      <n-tab-pane name="actions" :tab="$t('gameForm.tabs.actions')">
        <n-scrollbar class="tab-scrollbar">
          <n-form :model="gameForm" label-width="120" class="tab-form">
            <div class="actions-container">
              <div class="actions-header">
                <h3>{{ $t('gameForm.sections.gameActions') }}</h3>
                <n-button type="primary" size="small" @click="addAction">
                  <template #icon>
                    <n-icon>
                      <component :is="AddFilled" />
                    </n-icon>
                  </template>
                  {{ $t('gameForm.buttons.addAction') }}
                </n-button>
              </div>

              <div v-if="gameForm.actions && gameForm.actions.length > 0" class="actions-list">
                <div v-for="(action, index) in gameForm.actions" :key="index" class="action-item">
                  <div class="action-header">
                    <span class="action-index">{{ index + 1 }}</span>
                    <n-button type="error" size="small" text @click="removeAction(index)">
                      <template #icon>
                        <n-icon>
                          <component :is="DeleteOutlined" />
                        </n-icon>
                      </template>
                    </n-button>
                  </div>

                  <n-form-item :label="$t('gameForm.fields.actionName')">
                    <n-input v-model:value="action.name" :placeholder="$t('gameForm.placeholders.actionName')" />
                  </n-form-item>

                  <n-form-item :label="$t('gameForm.fields.actionType')">
                    <n-select v-model:value="action.type" :placeholder="$t('gameForm.placeholders.actionType')"
                      style="width: 100%" :options="actionTypeOptions" />
                  </n-form-item>

                  <n-form-item v-if="action.type === 'File'" :label="$t('gameForm.fields.executablePath')">
                    <div class="executable-path-input">
                      <n-input v-model:value="action.executablePath"
                        :placeholder="$t('gameForm.placeholders.executablePath')" />
                      <n-button @click="selectExecutablePath(index)" style="margin-left: 8px;">
                        {{ $t('gameForm.buttons.browse') }}
                      </n-button>
                    </div>
                  </n-form-item>

                  <n-form-item v-if="action.type === 'File'" :label="$t('gameForm.fields.parameters')">
                    <n-input v-model:value="action.parameters" :placeholder="$t('gameForm.placeholders.parameters')" />
                  </n-form-item>
                </div>
              </div>

              <div v-else class="no-actions">
                <n-empty :description="$t('gameForm.empty.noActions')" />
                <p class="hint-text">{{ $t('gameForm.empty.addActionsHint') }}</p>
              </div>
            </div>
          </n-form>
        </n-scrollbar>
      </n-tab-pane>

      <!-- Script Tab (TODO) -->
      <n-tab-pane name="script" :tab="$t('gameForm.tabs.script')">
        <n-scrollbar class="tab-scrollbar">
          <div class="placeholder-content">
            <n-empty :description="$t('gameForm.empty.scriptComingSoon')" />
          </div>
        </n-scrollbar>
      </n-tab-pane>
    </n-tabs>

    <!-- Buttons fixed at the bottom -->
    <div class="fixed-buttons">
      <n-button type="primary" @click="saveGame" :loading="saving">{{ $t('gameForm.buttons.save') }}</n-button>
      <n-button type="error" @click="closeWindow">{{ $t('gameForm.buttons.cancel') }}</n-button>
    </div>
  </div>
</template>

<script setup lang="ts" name="GameEditForm">
  import { ref, computed, toRaw, onMounted, nextTick } from 'vue'
  import { useMessage } from 'naive-ui'
  import { NIcon } from 'naive-ui'
  import type { SelectOption } from 'naive-ui'
  import { AddFilled, DeleteOutlined, InfoOutlined, FolderOpenOutlined, LinkOutlined } from '@vicons/material'
  import { useGameStore } from '../stores/game'
  import { PROC_MON_MODE } from '../constants/procMonMode'
  import { useI18n } from 'vue-i18n'

  // Use game store
  const gameStore = useGameStore()
  const message = useMessage()
  const { t } = useI18n()

  // Process monitor mode options (computed for reactivity)
  const procMonModeOptions = computed(() => [
    { label: t('gameForm.options.fileMode'), value: PROC_MON_MODE.FILE },
    { label: t('gameForm.options.folderMode'), value: PROC_MON_MODE.FOLDER },
    { label: t('gameForm.options.processMode'), value: PROC_MON_MODE.PROCESS }
  ])

  // Action type options
  const actionTypeOptions = computed(() => [
    { label: t('gameForm.options.file'), value: 'File' },
    { label: t('gameForm.options.link'), value: 'Link', disabled: true },
    { label: t('gameForm.options.script'), value: 'Script', disabled: true }
  ])

  // Options for select components
  const genreOptions = ref<SelectOption[]>([])
  const developerOptions = ref<SelectOption[]>([])
  const publisherOptions = ref<SelectOption[]>([])
  const tagOptions = ref<SelectOption[]>([])

  // Loading states
  const loadingGenres = ref(false)
  const loadingDevelopers = ref(false)
  const loadingPublishers = ref(false)
  const loadingTags = ref(false)

  // Active tab
  const activeTab = ref('general')

  const gameForm = ref<gameData>({
    uuid: '',
    title: '',
    coverImage: '',
    backgroundImage: '',
    iconImage: '',
    coverImageDisplay: '',
    backgroundImageDisplay: '',
    iconImageDisplay: '',
    lastPlayed: null,
    timePlayed: 0,
    workingDir: '',
    folderSize: 0,
    genre: [],
    developer: [],
    publisher: [],
    releaseDate: null,
    communityScore: 0,
    personalScore: 0,
    tags: [],
    links: [],
    description: [],
    actions: [],
    procMonMode: 1,  // Default to folder mode
    procNames: [],   // Default to empty array
    dateAdded: 0     // Will be set from received data
  })

  const saving = ref(false)

  // Image preview states
  const iconPreview = ref('')
  const backgroundPreview = ref('')
  const coverPreview = ref('')

  // Refs for select components
  const genreSelectRef = ref()
  const developerSelectRef = ref()
  const publisherSelectRef = ref()
  const tagSelectRef = ref()

  // Handle image selection from file system
  async function selectImageFromPath(imageType: 'icon' | 'background' | 'cover') {
    try {
      // Call electron API to open file dialog
      if (window.electronAPI?.selectImageFile) {
        const result = await window.electronAPI.selectImageFile()

        if (result && !result.canceled && result.filePaths.length > 0) {
          const selectedPath = result.filePaths[0]
          await processSelectedImage(selectedPath, imageType)
        }
      } else {
        message.error(t('gameForm.messages.fileSelectionUnavailable'))
      }
    } catch (error) {
      console.error('Error selecting image:', error)
      message.error(t('gameForm.messages.failedSelectImage'))
    }
  }

  // Process selected image (copy and rename)
  async function processSelectedImage(sourcePath: string, imageType: 'icon' | 'background' | 'cover') {
    try {
      if (window.electronAPI?.processGameImage) {
        const result = await window.electronAPI.processGameImage({
          sourcePath,
          gameUuid: gameForm.value.uuid,
          imageType
        })

        if (result.success) {
          // Update gameForm with temp image path
          switch (imageType) {
            case 'icon':
              if (result.tempPath && result.previewUrl) {
                gameForm.value.iconImage = result.tempPath
                iconPreview.value = result.previewUrl
              }
              break
            case 'background':
              if (result.tempPath && result.previewUrl) {
                gameForm.value.backgroundImage = result.tempPath
                backgroundPreview.value = result.previewUrl
              }
              break
            case 'cover':
              if (result.tempPath && result.previewUrl) {
                gameForm.value.coverImage = result.tempPath
                coverPreview.value = result.previewUrl
              }
              break
          }

          message.success(t('gameForm.messages.imageUpdated', { imageType }))
        } else {
          message.error(result.error || t('gameForm.messages.failedProcessImage'))
        }
      } else {
        message.error(t('gameForm.messages.imageApiUnavailable'))
      }
    } catch (error) {
      console.error('Error processing image:', error)
      message.error(t('gameForm.messages.failedProcessImage'))
    }
  }

  // Remove image
  function removeImage(imageType: 'icon' | 'background' | 'cover') {
    switch (imageType) {
      case 'icon':
        gameForm.value.iconImage = ''
        iconPreview.value = ''
        break
      case 'background':
        gameForm.value.backgroundImage = ''
        backgroundPreview.value = ''
        break
      case 'cover':
        gameForm.value.coverImage = ''
        coverPreview.value = ''
        break
    }
    message.success(t('gameForm.messages.imageRemoved', { imageType }))
  }  // Actions management functions
  function addAction() {
    if (!gameForm.value.actions) {
      gameForm.value.actions = []
    }
    gameForm.value.actions.push({
      name: '',
      type: 'File',
      executablePath: '',
      parameters: ''
    })
    message.success(t('gameForm.messages.actionAdded'))
  }

  function removeAction(index: number) {
    if (gameForm.value.actions && index >= 0 && index < gameForm.value.actions.length) {
      gameForm.value.actions.splice(index, 1)
      message.success(t('gameForm.messages.actionRemoved'))
    }
  }

  async function selectExecutablePath(index: number) {
    try {
      if (window.electronAPI?.selectExecutableFile) {
        const result = await window.electronAPI.selectExecutableFile()

        if (result && !result.canceled && result.filePaths.length > 0) {
          const selectedPath = result.filePaths[0]
          if (gameForm.value.actions && gameForm.value.actions[index]) {
            gameForm.value.actions[index].executablePath = selectedPath
            message.success(t('gameForm.messages.executableUpdated'))
          }
        }
      } else {
        message.error(t('gameForm.messages.fileSelectionUnavailable'))
      }
    } catch (error) {
      console.error('Error selecting executable:', error)
      message.error(t('gameForm.messages.failedSelectExe'))
    }
  }

  async function selectworkingDir() {
    try {
      if (window.electronAPI?.selectFolder) {
        const result = await window.electronAPI.selectFolder()

        if (result && !result.canceled && result.filePaths.length > 0) {
          const selectedPath = result.filePaths[0]
          gameForm.value.workingDir = selectedPath
          message.success(t('gameForm.messages.installPathUpdated'))
        }
      } else {
        message.error(t('gameForm.messages.folderSelectionUnavailable'))
      }
    } catch (error) {
      console.error('Error selecting folder:', error)
      message.error(t('gameForm.messages.failedSelectFolder'))
    }
  }

  // Links management functions
  function addLink() {
    if (!gameForm.value.links) {
      gameForm.value.links = []
    }
    gameForm.value.links.push({
      name: '',
      url: ''
    })
    message.success(t('gameForm.messages.linkAdded'))
  }

  function removeLink(index: number) {
    if (gameForm.value.links && index >= 0 && index < gameForm.value.links.length) {
      gameForm.value.links.splice(index, 1)
      message.success(t('gameForm.messages.linkRemoved'))
    }
  }

  // Process names management functions
  function addProcessName() {
    if (!gameForm.value.procNames) {
      gameForm.value.procNames = []
    }
    gameForm.value.procNames.push('')
    message.success(t('gameForm.messages.processNameAdded'))
  }

  function removeProcessName(index: number) {
    if (gameForm.value.procNames && index >= 0 && index < gameForm.value.procNames.length) {
      gameForm.value.procNames.splice(index, 1)
      message.success(t('gameForm.messages.processNameRemoved'))
    }
  }

  // Fetch options from database on component mount
  onMounted(async () => {
    try {
      // Fetch genres
      loadingGenres.value = true
      if (window.electronAPI?.getAllGenres) {
        const genres = await window.electronAPI.getAllGenres()
        genreOptions.value = genres.map(name => ({ label: name, value: name }))
      }
    } catch (error) {
      console.error('Error fetching genres:', error)
    } finally {
      loadingGenres.value = false
    }

    try {
      // Fetch developers
      loadingDevelopers.value = true
      if (window.electronAPI?.getAllDevelopers) {
        const developers = await window.electronAPI.getAllDevelopers()
        developerOptions.value = developers.map(name => ({ label: name, value: name }))
      }
    } catch (error) {
      console.error('Error fetching developers:', error)
    } finally {
      loadingDevelopers.value = false
    }

    try {
      // Fetch publishers
      loadingPublishers.value = true
      if (window.electronAPI?.getAllPublishers) {
        const publishers = await window.electronAPI.getAllPublishers()
        publisherOptions.value = publishers.map(name => ({ label: name, value: name }))
      }
    } catch (error) {
      console.error('Error fetching publishers:', error)
    } finally {
      loadingPublishers.value = false
    }

    try {
      // Fetch tags
      loadingTags.value = true
      if (window.electronAPI?.getAllTags) {
        const tags = await window.electronAPI.getAllTags()
        tagOptions.value = tags.map(name => ({ label: name, value: name }))
      }
    } catch (error) {
      console.error('Error fetching tags:', error)
    } finally {
      loadingTags.value = false
    }
  })

  // Render tag function (not used currently)
  const renderTag = undefined

  // Handle tag creation with comma-separated support
  function handleCreateTag(label: string, fieldType: 'genre' | 'developer' | 'publisher' | 'tag') {
    // Check if the label contains commas
    if (label && label.includes(',')) {
      // Split by comma and process each value
      const newValues = label
        .split(',')
        .map(v => v.trim())
        .filter(v => v.length > 0)

      if (newValues.length > 0) {
        // Get current values
        let currentValues: string[] = []
        let selectRef: any = null
        switch (fieldType) {
          case 'genre':
            currentValues = [...(gameForm.value.genre || [])]
            selectRef = genreSelectRef.value
            break
          case 'developer':
            currentValues = [...(gameForm.value.developer || [])]
            selectRef = developerSelectRef.value
            break
          case 'publisher':
            currentValues = [...(gameForm.value.publisher || [])]
            selectRef = publisherSelectRef.value
            break
          case 'tag':
            currentValues = [...(gameForm.value.tags || [])]
            selectRef = tagSelectRef.value
            break
        }

        // Merge with existing values, avoiding duplicates
        const merged = [...new Set([...currentValues, ...newValues])]

        // Update the form field immediately
        switch (fieldType) {
          case 'genre':
            gameForm.value.genre = merged
            break
          case 'developer':
            gameForm.value.developer = merged
            break
          case 'publisher':
            gameForm.value.publisher = merged
            break
          case 'tag':
            gameForm.value.tags = merged
            break
        }

        // Clear the search input by blurring and refocusing the input
        nextTick(() => {
          if (selectRef) {
            // Use blurInput and focusInput to operate on the internal input element
            selectRef.blurInput()
            setTimeout(() => {
              selectRef.focusInput()
            }, 320) // Slight delay to ensure blur has taken effect
          }
        })

        // Return false to prevent the original comma-separated text from being added
        return false
      }
    }

    // No comma found, return the label as-is to add it normally
    return label
  }

  // Load existing image preview
  async function loadExistingImagePreview(imagePath: string, imageType: 'icon' | 'background' | 'cover') {
    if (!imagePath || !window.electronAPI?.processGameImage) return

    console.log(`Loading existing ${imageType} image:`, imagePath)

    try {
      // Convert file path to base64 for preview
      const result = await window.electronAPI.processGameImage({
        sourcePath: imagePath,
        gameUuid: gameForm.value.uuid,
        imageType: 'preview' // Special type for loading existing images
      })

      console.log(`Preview result for ${imageType}:`, result)

      if (result.success && result.previewUrl) {
        switch (imageType) {
          case 'icon':
            iconPreview.value = result.previewUrl
            break
          case 'background':
            backgroundPreview.value = result.previewUrl
            break
          case 'cover':
            coverPreview.value = result.previewUrl
            break
        }
        console.log(`Successfully set ${imageType} preview`)
      } else {
        console.log(`Failed to load ${imageType} preview:`, result.error)
      }
    } catch (error) {
      console.error(`Error loading ${imageType} preview:`, error)
    }
  }

  // deal with description input
  const descriptionInput = computed({
    get: () => gameForm.value.description.join('\n'),
    set: (value: string) => {
      gameForm.value.description = value.split('\n').filter(line => line.trim().length > 0)
    }
  })

  // save game information
  const saveGame = async () => {
    saving.value = true
    try {
      console.log('Saving game info:', gameForm.value)

      // Convert reactive object to plain object to avoid cloning issues
      const plainGameData = toRaw(gameForm.value)
      console.log('Plain game data:', plainGameData)

      // Use the store to update the game (which will also update the database)
      await gameStore.updateGame(plainGameData)
      message.success(t('gameForm.messages.saveSuccess'))

      // delay close window
      setTimeout(() => {
        closeWindow()
      }, 1000)
    } catch (error) {
      console.error('Save Error:', error)
      message.error(t('gameForm.messages.saveFailed'))
    } finally {
      saving.value = false
    }
  }

  // close the edit window
  const closeWindow = async () => {
    // Clean up temporary images when closing without saving
    if (window.electronAPI?.cleanupTempImages) {
      await window.electronAPI.cleanupTempImages(gameForm.value.uuid)
    }
    window.close()
  }

  // listen for game data from the main process
  onMounted(() => {
    if (window.electronAPI?.onEditGameData) {
      window.electronAPI.onEditGameData((data: gameData) => {
        console.log('Received game data:', data)

        gameForm.value.uuid = data.uuid || ''
        gameForm.value.title = data.title || ''
        gameForm.value.coverImage = data.coverImage || ''
        gameForm.value.backgroundImage = data.backgroundImage || ''
        gameForm.value.iconImage = data.iconImage || ''
        gameForm.value.lastPlayed = data.lastPlayed ?? null
        gameForm.value.timePlayed = data.timePlayed || 0
        gameForm.value.workingDir = data.workingDir || ''
        gameForm.value.folderSize = data.folderSize || 0
        gameForm.value.genre = Array.isArray(data.genre) ? data.genre : []
        gameForm.value.developer = Array.isArray(data.developer) ? data.developer : []
        gameForm.value.publisher = Array.isArray(data.publisher) ? data.publisher : []
        gameForm.value.releaseDate = data.releaseDate ?? null
        gameForm.value.communityScore = data.communityScore || 0
        gameForm.value.personalScore = data.personalScore || 0
        gameForm.value.tags = Array.isArray(data.tags) ? data.tags : []
        gameForm.value.description = Array.isArray(data.description) ? data.description : []
        gameForm.value.links = Array.isArray(data.links) ? data.links : []
        gameForm.value.actions = Array.isArray(data.actions) ? data.actions : []
        gameForm.value.procMonMode = data.procMonMode ?? PROC_MON_MODE.FOLDER  // Default to folder mode
        gameForm.value.procNames = Array.isArray(data.procNames) ? data.procNames : []  // Default to empty array
        gameForm.value.dateAdded = data.dateAdded || Date.now()  // Set dateAdded from data
        // Load existing image previews
        if (data.iconImage) {
          loadExistingImagePreview(data.iconImage, 'icon')
        }
        if (data.backgroundImage) {
          loadExistingImagePreview(data.backgroundImage, 'background')
        }
        if (data.coverImage) {
          loadExistingImagePreview(data.coverImage, 'cover')
        }
      })
    }
  })
</script>

<style scoped>
  .edit-container {
    height: 100vh;
    padding: 0;
    display: flex;
    flex-direction: column;
  }

  .tabs-container {
    flex: 1;
    background-color: transparent;
    padding: 0 15px;
    display: flex;
    flex-direction: column;
    min-height: 0;
    /* Crucial for flex scrolling */
    overflow: hidden;

    :deep(.n-tabs-nav) {
      flex-shrink: 0;
    }

    :deep(.n-tabs-pane-wrapper) {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      min-height: 0;
      /* Crucial */
    }

    :deep(.n-tab-pane) {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
      /* Ensure pane height is constrained */
    }
  }

  .tab-scrollbar {
    flex: 1;
    height: 60%;
    min-height: 0;
  }

  /* Force constraints on scrollbar container */
  :deep(.n-scrollbar-container) {
    height: calc(100%) !important;
  }

  :deep(.n-tab-pane) {
    height: calc(100%) !important;
  }

  :deep(.n-scrollbar-content) {
    /* Add bottom padding to prevent content from being hidden behind fixed buttons */
    padding-bottom: 160px;
  }

  .tab-form {
    padding: 10px 30px;
  }

  .placeholder-content {
    padding: 30px;
    display: flex;
    justify-content: center;
    align-items: center;
    /* Subtract the height of the tab header and bottom buttons */
    min-height: calc(100vh - 160px);
  }

  .file-hint {
    font-size: 12px;
    color: #909399;
    margin-top: 5px;
    margin-left: 2px;
  }

  /* Styles for the fixed bottom buttons */
  .fixed-buttons {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: var(--titlebar-sub-bg);
    border-top: 1px solid var(--fixed-bottom-border);
    padding: 15px 20px;
    display: flex;
    justify-content: center;
    gap: 15px;
    z-index: 100;
  }

  /* Media tab specific styles */
  .media-container {
    display: flex;
    gap: 0;
    padding: 0 10px;
    margin-bottom: 30px;
    height: 100%;
  }

  .media-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .media-section {
    padding: 10px 20px;
  }

  .media-section.full-height {
    /* Cover section takes full height of right column */
    flex: 1;
    min-height: 400px;
  }

  .section-header {
    margin-bottom: 15px;
  }

  .section-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--el-color-primary);
    display: block;
    margin-bottom: 8px;
  }

  .title-underline {
    height: 2px;
    background-color: #409eff;
    border-radius: 1px;
    margin-bottom: 15px;
  }

  .image-display-area {
    border: 2px dashed #d3d3d3;
    border-radius: 6px;
    background-color: var(--image-area-bg);
    margin-bottom: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #909399;
    font-size: 14px;
    position: relative;
    overflow: hidden;
  }

  /* Icon area - square shape */
  .icon-area {
    width: 64px;
    height: 64px;
    margin: 0 auto 15px auto;
  }

  /* Background area - landscape rectangle */
  .background-area {
    width: 100%;
    height: 200px;
    max-width: 400px;
    margin: 0 auto 15px auto;
  }

  /* Cover area - portrait rectangle */
  .cover-area {
    width: 240px;
    height: 320px;
    margin: 0 auto 15px auto;
  }

  .image-display-area.has-image {
    border: 0;
    border-radius: 0;
  }

  .image-preview {
    width: 100%;
    height: auto;
    object-fit: contain;
  }

  /* Icon preview - maintain aspect ratio */
  .icon-preview {
    object-fit: contain;
  }

  /* Background preview - maintain aspect ratio */
  .background-preview {
    object-fit: contain;
  }

  /* Cover preview - maintain aspect ratio */
  .cover-preview {
    object-fit: contain;
  }

  .placeholder-text {
    text-align: center;
    color: #c0c4cc;
    font-style: italic;
  }

  .action-buttons {
    display: flex;
    gap: 10px;
    justify-content: center;
  }

  .action-btn {
    width: 40px;
    height: 40px;
    border: 1px solid #dcdfe6;
    border-radius: 6px;
    background-color: var(--ation-btn-bg);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
  }

  .action-btn:hover {
    border-color: #409eff;
    background-color: var(--el-color-primary-light-3);
  }

  .btn-icon {
    width: 20px;
    height: 20px;
    opacity: 0.7;
  }

  .action-btn:hover .btn-icon {
    opacity: 1;
  }

  /* Actions tab specific styles */
  .actions-container {
    max-width: 800px;
  }

  .actions-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 1px solid #e4e7ed;
  }

  .actions-header h3 {
    margin: 0;
    color: var(--el-color-primary);
    font-size: 18px;
  }

  .actions-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .action-item {
    border: 1px solid #e4e7ed;
    border-radius: 8px;
    padding: 20px;
    background-color: var(--link-action-item-bg);
    position: relative;
  }

  .action-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }

  .action-index {
    background-color: #409eff;
    color: white;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
  }

  .executable-path-input {
    width: 100%;
    display: flex;
    align-items: center;
  }

  .executable-path-input .el-input {
    flex: 1;
  }

  .install-path-input {
    width: 100%;
    display: flex;
    align-items: center;
  }

  .install-path-input .el-input {
    flex: 1;
  }

  .no-actions {
    text-align: center;
    padding: 40px 20px;
  }

  .hint-text {
    color: #909399;
    font-size: 14px;
    margin-top: 10px;
  }

  /* Links tab specific styles */
  .links-container {
    max-width: 800px;
    margin-bottom: 30px;
  }

  .links-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 1px solid #e4e7ed;
  }

  .links-header h3 {
    margin: 0;
    color: var(--el-color-primary);
    font-size: 18px;
  }

  .links-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .link-item {
    border: 1px solid #e4e7ed;
    border-radius: 8px;
    padding: 20px;
    background-color: var(--link-action-item-bg);
    position: relative;
  }

  .link-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }

  .link-index {
    background-color: #409eff;
    color: white;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
  }

  .no-links {
    text-align: center;
    padding: 40px 20px;
  }

  /* Process names specific styles */
  .process-names-container {
    width: 100%;
  }

  .process-names-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e4e7ed;
  }

  .process-names-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .process-name-item {
    display: flex;
    align-items: center;
    width: 100%;
  }

  .no-process-names {
    text-align: center;
    padding: 20px;
    background-color: #f8f9fa;
    border-radius: 6px;
    border: 1px dashed #d3d3d3;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .edit-container {
      height: 100vh;
    }

    .tab-form {
      padding: 20px;
    }

    .tab-scrollbar {
      /* Adjust height for small screens */
      height: calc(100vh - 140px);
    }

    :deep(.el-tabs__nav-wrap) {
      padding: 0 15px;
    }

    :deep(.el-form-item__label) {
      width: 100px !important;
    }

    /* Media tab responsive */
    .media-container {
      flex-direction: column;
      padding: 20px;
      gap: 20px;
    }

    .media-section {
      padding: 15px;
    }

    /* Icon area - smaller on mobile */
    .icon-area {
      width: 80px;
      height: 80px;
    }

    /* Background area - smaller on mobile */
    .background-area {
      height: 90px;
      max-width: 300px;
    }

    /* Cover area - smaller on mobile */
    .cover-area {
      width: 160px;
      height: 240px;
    }
  }
</style>
