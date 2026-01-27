<template>
  <div class="edit-container">
    <!-- Tab Navigation -->
    <n-tabs v-model:value="activeTab" class="tabs-container" type="line">
      <!-- General Tab -->
      <n-tab-pane name="general" tab="General">
        <n-scrollbar class="tab-scrollbar">
          <n-form :model="gameForm" label-width="120" class="tab-form">
            <n-form-item label="Title">
              <n-input v-model:value="gameForm.title" placeholder="Enter game title" />
            </n-form-item>

            <n-form-item label="Genre">
              <n-select ref="genreSelectRef" v-model:value="gameForm.genre" filterable multiple tag
                :options="genreOptions" placeholder="Select or create genres (comma-separated)" :loading="loadingGenres"
                :render-tag="renderTag" :show-arrow="false"
                @create="(label: string) => handleCreateTag(label, 'genre')" />
            </n-form-item>

            <n-form-item label="Developer">
              <n-select ref="developerSelectRef" v-model:value="gameForm.developer" filterable multiple tag
                :options="developerOptions" placeholder="Select or create developers (comma-separated)"
                :loading="loadingDevelopers" :render-tag="renderTag" :show-arrow="false"
                @create="(label: string) => handleCreateTag(label, 'developer')" />
            </n-form-item>

            <n-form-item label="Publisher">
              <n-select ref="publisherSelectRef" v-model:value="gameForm.publisher" filterable multiple tag
                :options="publisherOptions" placeholder="Select or create publishers (comma-separated)"
                :loading="loadingPublishers" :render-tag="renderTag" :show-arrow="false"
                @create="(label: string) => handleCreateTag(label, 'publisher')" />
            </n-form-item>

            <n-form-item label="Release Date">
              <n-date-picker v-model:value="gameForm.releaseDate" placeholder="Release date (e.g., 2017-07-20)"
                type="date" style="width: 100%;" />
            </n-form-item>

            <!-- Community Score and User Score in one row -->
            <n-grid :cols="2" :x-gap="20">
              <n-gi>
                <n-form-item label="Community Score">
                  <n-input-number v-model:value="gameForm.communityScore" placeholder="Community score (0-100)" :min="0"
                    :max="100" style="width: 100%;" />
                </n-form-item>
              </n-gi>
              <n-gi>
                <n-form-item label="User Score">
                  <n-input-number v-model:value="gameForm.personalScore" placeholder="User score (0-100)" :min="0"
                    :max="100" style="width: 100%;" />
                </n-form-item>
              </n-gi>
            </n-grid>

            <n-form-item label="Tags">
              <n-select ref="tagSelectRef" v-model:value="gameForm.tags" filterable multiple tag :options="tagOptions"
                placeholder="Select or create tags (comma-separated)" :loading="loadingTags" :render-tag="renderTag"
                :show-arrow="false" @create="(label: string) => handleCreateTag(label, 'tag')" />
            </n-form-item>

            <n-form-item label="Description">
              <n-input v-model:value="descriptionInput" type="textarea" :rows="8"
                placeholder="Each line is a new paragraph" :autosize="{ minRows: 6, maxRows: 12 }" />
            </n-form-item>
          </n-form>
        </n-scrollbar>
      </n-tab-pane>

      <!-- Advanced Tab -->
      <n-tab-pane name="advanced" tab="Advanced">
        <n-scrollbar class="tab-scrollbar">
          <n-form :model="gameForm" label-width="120" class="tab-form">
            <n-form-item label="UUID">
              <n-input v-model:value="gameForm.uuid" placeholder="Unique identifier for the game" disabled />
            </n-form-item>

            <n-form-item label="Install Path">
              <div class="install-path-input">
                <n-input v-model:value="gameForm.workingDir" placeholder="Game installation path" />
                <n-button @click="selectworkingDir" style="margin-left: 8px;">
                  Browse
                </n-button>
              </div>
            </n-form-item>

            <!-- Install Size and Time Played in one row -->
            <n-grid :cols="2" :x-gap="20">
              <n-gi>
                <n-form-item label="Install Size">
                  <n-input-number v-model:value="gameForm.folderSize" placeholder="Installation size in bytes" :min="0"
                    style="width: 100%;" />
                </n-form-item>
              </n-gi>
              <n-gi>
                <n-form-item label="Time Played">
                  <n-input-number v-model:value="gameForm.timePlayed" placeholder="Time played in seconds" :min="0"
                    style="width: 100%;" />
                </n-form-item>
              </n-gi>
            </n-grid>

            <n-form-item label="Last Played">
              <n-date-picker v-model:value="gameForm.lastPlayed" type="date" placeholder="Select last played date"
                format="yyyy-MM-dd" value-format="yyyy-MM-dd" style="width: 100%;" />
            </n-form-item>

            <n-form-item label="Monitor Mode">
              <div style="display: flex; align-items: center; gap: 8px; width: 100%;">
                <n-select v-model:value="gameForm.procMonMode" placeholder="Select process monitoring mode"
                  style="width: calc(100% - 32px);" :options="procMonModeOptions" />
                <n-tooltip trigger="hover" placement="top">
                  <template #trigger>
                    <n-icon size="24" style="color: #909399; cursor: help; flex-shrink: 0;">
                      <InfoOutlined />
                    </n-icon>
                  </template>
                  <div style="max-width: 280px; line-height: 1.5;">
                    This option affects how game statistics are recorded:<br>
                    • <strong>File mode:</strong> monitors only the process launched by actions<br>
                    • <strong>Folder mode:</strong> monitors all executable processes created in the game's working
                    directory<br>
                    • <strong>Process mode:</strong> for handling extreme cases - enter process names to monitor
                    specific process activities
                    <hr>
                    <strong>Attention: Only Folder mode is well maintained and reliable Now.</strong>
                  </div>
                </n-tooltip>
              </div>
            </n-form-item>

            <!-- Process Names - Only show when Process Monitor is selected -->
            <n-form-item v-if="gameForm.procMonMode === PROC_MON_MODE.PROCESS" label="Process Names">
              <div class="process-names-container">
                <div class="process-names-header">
                  <span class="hint-text">Enter process names to monitor (e.g., game.exe, launcher.exe)</span>
                  <n-button type="primary" size="small" @click="addProcessName">
                    <template #icon>
                      <AddFilled />
                    </template>
                    Add Process
                  </n-button>
                </div>

                <div v-if="gameForm.procNames && gameForm.procNames.length > 0" class="process-names-list">
                  <div v-for="(_, index) in gameForm.procNames" :key="index" class="process-name-item">
                    <n-input v-model:value="gameForm.procNames[index]" placeholder="Enter process name (e.g., game.exe)"
                      style="flex: 1;" />
                    <n-button type="error" size="small" @click="removeProcessName(index)" style="margin-left: 8px;">
                      <template #icon>
                        <DeleteOutlined />
                      </template>
                    </n-button>
                  </div>
                </div>

                <div v-else class="no-process-names">
                  <p class="hint-text">No process names added yet. Click "Add Process" to add process names to monitor.
                  </p>
                </div>
              </div>
            </n-form-item>
          </n-form>
        </n-scrollbar>
      </n-tab-pane>

      <!-- Media Tab -->
      <n-tab-pane name="media" tab="Media">
        <n-scrollbar class="tab-scrollbar">
          <div class="media-container">
            <!-- Left Column -->
            <div class="media-column">
              <!-- Icon Section -->
              <div class="media-section">
                <div class="section-header">
                  <span class="section-title">Icon</span>
                  <div class="title-underline"></div>
                </div>
                <div class="image-display-area icon-area" :class="{ 'has-image': iconPreview }">
                  <img v-if="iconPreview" :src="iconPreview" alt="Icon Preview" class="image-preview icon-preview" />
                  <span v-else class="placeholder-text">No icon selected</span>
                </div>
                <div class="action-buttons">
                  <button class="action-btn" title="Select from path" @click="selectImageFromPath('icon')">
                    <n-icon size="20">
                      <component :is="FolderOpenOutlined" />
                    </n-icon>
                  </button>
                  <button class="action-btn" title="Add from URL">
                    <n-icon size="20">
                      <component :is="LinkOutlined" />
                    </n-icon>
                  </button>
                  <button class="action-btn" title="Remove" @click="removeImage('icon')">
                    <n-icon size="20">
                      <component :is="DeleteOutlined" />
                    </n-icon>
                  </button>
                </div>
              </div>

              <!-- Background Section -->
              <div class="media-section">
                <div class="section-header">
                  <span class="section-title">Background</span>
                  <div class="title-underline"></div>
                </div>
                <div class="image-display-area background-area" :class="{ 'has-image': backgroundPreview }">
                  <img v-if="backgroundPreview" :src="backgroundPreview" alt="Background Preview"
                    class="image-preview background-preview" />
                  <span v-else class="placeholder-text">No background selected</span>
                </div>
                <div class="action-buttons">
                  <button class="action-btn" title="Select from path" @click="selectImageFromPath('background')">
                    <n-icon size="20">
                      <component :is="FolderOpenOutlined" />
                    </n-icon>
                  </button>
                  <button class="action-btn" title="Add from URL">
                    <n-icon size="20">
                      <component :is="LinkOutlined" />
                    </n-icon>
                  </button>
                  <button class="action-btn" title="Remove" @click="removeImage('background')">
                    <n-icon size="20">
                      <component :is="DeleteOutlined" />
                    </n-icon>
                  </button>
                </div>
              </div>
            </div>

            <!-- Right Column -->
            <div class="media-column">
              <!-- Cover Section -->
              <div class="media-section full-height">
                <div class="section-header">
                  <span class="section-title">Cover</span>
                  <div class="title-underline"></div>
                </div>
                <div class="image-display-area cover-area" :class="{ 'has-image': coverPreview }">
                  <img v-if="coverPreview" :src="coverPreview" alt="Cover Preview"
                    class="image-preview cover-preview" />
                  <span v-else class="placeholder-text">No cover selected</span>
                </div>
                <div class="action-buttons">
                  <button class="action-btn" title="Select from path" @click="selectImageFromPath('cover')">
                    <n-icon size="20">
                      <component :is="FolderOpenOutlined" />
                    </n-icon>
                  </button>
                  <button class="action-btn" title="Add from URL">
                    <n-icon size="20">
                      <component :is="LinkOutlined" />
                    </n-icon>
                  </button>
                  <button class="action-btn" title="Remove" @click="removeImage('cover')">
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
      <n-tab-pane name="links" tab="Links">
        <n-scrollbar class="tab-scrollbar">
          <n-form :model="gameForm" label-width="120" class="tab-form">
            <div class="links-container">
              <div class="links-header">
                <h3>Game Links</h3>
                <n-button type="primary" @click="addLink">
                  <template #icon>
                    <AddFilled />
                  </template>
                  Add Link
                </n-button>
              </div>

              <div v-if="gameForm.links && gameForm.links.length > 0" class="links-list">
                <div v-for="(link, index) in gameForm.links" :key="index" class="link-item">
                  <div class="link-header">
                    <div class="link-index">{{ index + 1 }}</div>
                    <n-button type="error" size="small" circle @click="removeLink(index)">
                      <template #icon>
                        <DeleteOutlined />
                      </template>
                    </n-button>
                  </div>

                  <n-form-item label="Link Name" :path="`links.${index}.name`">
                    <n-input v-model:value="link.name" placeholder="Enter link name (e.g., VNDB, Official Site)" />
                  </n-form-item>

                  <n-form-item label="URL" :path="`links.${index}.url`">
                    <n-input v-model:value="link.url" placeholder="Enter URL (e.g., https://vndb.org/...)" />
                  </n-form-item>
                </div>
              </div>

              <div v-else class="no-links">
                <p>No links added yet</p>
                <p class="hint-text">Add links to external sites like VNDB, official websites, etc.</p>
              </div>
            </div>
          </n-form>
        </n-scrollbar>
      </n-tab-pane>

      <!-- Actions Tab -->
      <n-tab-pane name="actions" tab="Actions">
        <n-scrollbar class="tab-scrollbar">
          <n-form :model="gameForm" label-width="120" class="tab-form">
            <div class="actions-container">
              <div class="actions-header">
                <h3>Game Actions</h3>
                <n-button type="primary" size="small" @click="addAction">
                  <template #icon>
                    <AddFilled />
                  </template>
                  Add Action
                </n-button>
              </div>

              <div v-if="gameForm.actions && gameForm.actions.length > 0" class="actions-list">
                <div v-for="(action, index) in gameForm.actions" :key="index" class="action-item">
                  <div class="action-header">
                    <span class="action-index">{{ index + 1 }}</span>
                    <n-button type="error" size="small" text @click="removeAction(index)">
                      <template #icon>
                        <DeleteOutlined />
                      </template>
                    </n-button>
                  </div>

                  <n-form-item label="Action Name">
                    <n-input v-model:value="action.name" placeholder="Enter action name (e.g., Play)" />
                  </n-form-item>

                  <n-form-item label="Type">
                    <n-select v-model:value="action.type" placeholder="Select action type" style="width: 100%"
                      :options="actionTypeOptions" />
                  </n-form-item>

                  <n-form-item v-if="action.type === 'File'" label="Executable Path">
                    <div class="executable-path-input">
                      <n-input v-model:value="action.executablePath" placeholder="Path to executable file" />
                      <n-button @click="selectExecutablePath(index)" style="margin-left: 8px;">
                        Browse
                      </n-button>
                    </div>
                  </n-form-item>

                  <n-form-item v-if="action.type === 'File'" label="Parameters">
                    <n-input v-model:value="action.parameters"
                      placeholder="Optional command line parameters (NOT AVAILABLE YET)" />
                  </n-form-item>
                </div>
              </div>

              <div v-else class="no-actions">
                <n-empty description="No actions configured" />
                <p class="hint-text">Add actions to define how to launch or interact with this game.</p>
              </div>
            </div>
          </n-form>
        </n-scrollbar>
      </n-tab-pane>

      <!-- Script Tab (TODO) -->
      <n-tab-pane name="script" tab="Script">
        <n-scrollbar class="tab-scrollbar">
          <div class="placeholder-content">
            <n-empty description="Script configuration coming soon..." />
          </div>
        </n-scrollbar>
      </n-tab-pane>
    </n-tabs>

    <!-- Buttons fixed at the bottom -->
    <div class="fixed-buttons">
      <n-button type="primary" @click="saveGame" :loading="saving">Save</n-button>
      <n-button type="error" @click="closeWindow">Cancel</n-button>
    </div>
  </div>
</template>

<script setup lang="ts" name="GameAddForm">
  import { ref, computed, toRaw, onMounted, nextTick } from 'vue'
  import { useMessage } from 'naive-ui'
  import { NIcon } from 'naive-ui'
  import type { SelectOption } from 'naive-ui'
  import { AddFilled, DeleteOutlined, InfoOutlined, FolderOpenOutlined, LinkOutlined } from '@vicons/material'
  import { v4 as uuidv4 } from 'uuid'
  import { useGameStore } from '../stores/game'
  import { PROC_MON_MODE } from '../constants/procMonMode'

  // Use game store
  const gameStore = useGameStore()
  const message = useMessage()

  // Process monitor mode options
  const procMonModeOptions: SelectOption[] = [
    { label: 'File Mode', value: PROC_MON_MODE.FILE },
    { label: 'Folder Mode', value: PROC_MON_MODE.FOLDER },
    { label: 'Process Mode', value: PROC_MON_MODE.PROCESS }
  ]

  // Action type options
  const actionTypeOptions: SelectOption[] = [
    { label: 'File', value: 'File' },
    { label: 'Link', value: 'Link', disabled: true },
    { label: 'Script', value: 'Script', disabled: true }
  ]

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

  // Generate a new UUID for the game
  const uuid = uuidv4();
  console.log('Generated UUID:', uuid)

  // Initialize gameForm
  const gameForm = ref<gameData>({
    uuid: uuid,
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
    dateAdded: new Date().toISOString().replace('T', ' ').substring(0, 19)  // Set current timestamp
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
        message.error('File selection API not available')
      }
    } catch (error) {
      console.error('Error selecting image:', error)
      message.error('Failed to select image')
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

          message.success(`${imageType} image updated successfully!`)
        } else {
          message.error(result.error || 'Failed to process image')
        }
      } else {
        message.error('Image processing API not available')
      }
    } catch (error) {
      console.error('Error processing image:', error)
      message.error('Failed to process image')
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
    message.success(`${imageType} image removed`)
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
    message.success('Action added')
  }

  function removeAction(index: number) {
    if (gameForm.value.actions && index >= 0 && index < gameForm.value.actions.length) {
      gameForm.value.actions.splice(index, 1)
      message.success('Action removed')
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
            message.success('Executable path updated')
          }
        }
      } else {
        message.error('File selection API not available')
      }
    } catch (error) {
      console.error('Error selecting executable:', error)
      message.error('Failed to select executable')
    }
  }

  async function selectworkingDir() {
    try {
      if (window.electronAPI?.selectFolder) {
        const result = await window.electronAPI.selectFolder()

        if (result && !result.canceled && result.filePaths.length > 0) {
          const selectedPath = result.filePaths[0]
          gameForm.value.workingDir = selectedPath
          message.success('Install path updated')
        }
      } else {
        message.error('Folder selection API not available')
      }
    } catch (error) {
      console.error('Error selecting folder:', error)
      message.error('Failed to select folder')
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
    message.success('Link added')
  }

  function removeLink(index: number) {
    if (gameForm.value.links && index >= 0 && index < gameForm.value.links.length) {
      gameForm.value.links.splice(index, 1)
      message.success('Link removed')
    }
  }

  // Process names management functions
  function addProcessName() {
    if (!gameForm.value.procNames) {
      gameForm.value.procNames = []
    }
    gameForm.value.procNames.push('')
    message.success('Process name added')
  }

  function removeProcessName(index: number) {
    if (gameForm.value.procNames && index >= 0 && index < gameForm.value.procNames.length) {
      gameForm.value.procNames.splice(index, 1)
      message.success('Process name removed')
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

  // deal with description input
  const descriptionInput = computed({
    get: () => gameForm.value.description.join('\n'),
    set: (value: string) => {
      gameForm.value.description = value.split('\n').filter(line => line.trim().length > 0)
    }
  })

  // save game information
  async function saveGame() {
    saving.value = true
    try {
      console.log('Saving game info:', gameForm.value)

      // Convert reactive object to plain object to avoid cloning issues
      const plainGameData = toRaw(gameForm.value)

      // Convert null dates to empty strings for database compatibility
      if (plainGameData.lastPlayed === null) {
        plainGameData.lastPlayed = ''
      }
      if (plainGameData.releaseDate === null) {
        plainGameData.releaseDate = ''
      }

      console.log('Plain game data:', plainGameData)

      // Use the store to add the game (which will also update the database)
      await gameStore.addGame(plainGameData)
      message.success('Game information saved successfully!')

      // delay close window
      setTimeout(() => {
        closeWindow()
      }, 1000)
    } catch (error) {
      console.error('Save Error:', error)
      message.error('Failed to add game')
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
