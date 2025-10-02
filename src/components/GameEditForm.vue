<template>
  <div class="edit-container">
    <!-- Tab Navigation -->
    <el-tabs v-model="activeTab" class="tabs-container">
      <!-- General Tab -->
      <el-tab-pane label="General" name="general">
        <el-scrollbar class="tab-scrollbar">
          <el-form :model="gameForm" label-width="120px" class="tab-form">
            <el-form-item label="Title">
              <el-input v-model="gameForm.title" placeholder="Enter game title" />
            </el-form-item>

            <!-- Genre and Release Date in one row -->
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="Genre">
                  <el-input v-model="gameForm.genre" placeholder="Game genre" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="Release Date">
                  <el-date-picker v-model="gameForm.releaseDate" placeholder="Release date (e.g., 2017-07-20)"
                    type="date" style="width: 100%;" />
                </el-form-item>
              </el-col>
            </el-row>

            <!-- Developer and Publisher in one row -->
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="Developer">
                  <el-input v-model="gameForm.developer" placeholder="Game developer" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="Publisher">
                  <el-input v-model="gameForm.publisher" placeholder="Game publisher" />
                </el-form-item>
              </el-col>
            </el-row>

            <!-- Community Score and User Score in one row -->
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="Community Score">
                  <el-input v-model="gameForm.communityScore" placeholder="Community score (0-100)" type="number" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="User Score">
                  <el-input v-model="gameForm.personalScore" placeholder="User score (0-100)" type="number" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="Tags">
              <el-input v-model="tagsInput" type="textarea" :rows="4"
                placeholder="Separate tags with commas (e.g., Romance, Visual Novel, Drama)"
                :autosize="{ minRows: 3, maxRows: 6 }" />
            </el-form-item>

            <el-form-item label="Description">
              <el-input v-model="descriptionInput" type="textarea" :rows="8" placeholder="Each line is a new paragraph"
                :autosize="{ minRows: 6, maxRows: 12 }" />
            </el-form-item>
          </el-form>
        </el-scrollbar>
      </el-tab-pane>

      <!-- Advanced Tab -->
      <el-tab-pane label="Advanced" name="advanced">
        <el-scrollbar class="tab-scrollbar">
          <el-form :model="gameForm" label-width="120px" class="tab-form">
            <el-form-item label="UUID">
              <el-input v-model="gameForm.uuid" placeholder="Unique identifier for the game" disabled />
            </el-form-item>

            <el-form-item label="Install Path">
              <div class="install-path-input">
                <el-input v-model="gameForm.workingDir" placeholder="Game installation path" />
                <el-button @click="selectworkingDir" style="margin-left: 8px;">
                  Browse
                </el-button>
              </div>
            </el-form-item>

            <!-- Install Size and Time Played in one row -->
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="Install Size">
                  <el-input v-model="gameForm.folderSize" placeholder="Installation size in bytes" type="number" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="Time Played">
                  <el-input v-model="gameForm.timePlayed" placeholder="Time played in seconds" type="number" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="Last Played">
              <el-date-picker v-model="gameForm.lastPlayed" type="date" placeholder="Select last played date"
                format="YYYY-MM-DD" value-format="YYYY-MM-DD" style="width: 100%;" />
            </el-form-item>

            <el-form-item label="Monitor Mode">
              <div style="display: flex; align-items: center; gap: 8px; width: 100%;">
                <el-select v-model="gameForm.procMonMode" placeholder="Select process monitoring mode"
                  style="width: calc(100% - 32px);">
                  <el-option label="File Mode" :value="PROC_MON_MODE.FILE" />
                  <el-option label="Folder Mode" :value="PROC_MON_MODE.FOLDER" />
                  <el-option label="Process Mode" :value="PROC_MON_MODE.PROCESS" />
                </el-select>
                <el-tooltip placement="top" :show-after="300" popper-style="max-width: 300px;">
                  <template #content>
                    <div style="max-width: 280px; line-height: 1.5;">
                      This option affects how game statistics are recorded:<br>
                      • <strong>File mode:</strong> monitors only the process launched by actions<br>
                      • <strong>Folder mode:</strong> monitors all executable processes created in the game's working
                      directory<br>
                      • <strong>Process mode:</strong> for handling extreme cases - enter process names to monitor
                      specific process activities
                    </div>
                  </template>
                  <el-icon style="color: #909399; cursor: help; width: 24px; height: 24px; flex-shrink: 0;">
                    <InfoFilled />
                  </el-icon>
                </el-tooltip>
              </div>
            </el-form-item>

            <!-- Process Names - Only show when Process Monitor is selected -->
            <el-form-item v-if="gameForm.procMonMode === PROC_MON_MODE.PROCESS" label="Process Names">
              <div class="process-names-container">
                <div class="process-names-header">
                  <span class="hint-text">Enter process names to monitor (e.g., game.exe, launcher.exe)</span>
                  <el-button type="primary" size="small" :icon="Plus" @click="addProcessName">
                    Add Process
                  </el-button>
                </div>

                <div v-if="gameForm.procNames && gameForm.procNames.length > 0" class="process-names-list">
                  <div v-for="(_, index) in gameForm.procNames" :key="index" class="process-name-item">
                    <el-input v-model="gameForm.procNames[index]" placeholder="Enter process name (e.g., game.exe)"
                      style="flex: 1;" />
                    <el-button type="danger" size="small" :icon="Delete" @click="removeProcessName(index)"
                      style="margin-left: 8px;" />
                  </div>
                </div>

                <div v-else class="no-process-names">
                  <p class="hint-text">No process names added yet. Click "Add Process" to add process names to monitor.
                  </p>
                </div>
              </div>
            </el-form-item>
          </el-form>
        </el-scrollbar>
      </el-tab-pane>

      <!-- Media Tab -->
      <el-tab-pane label="Media" name="media">
        <el-scrollbar class="tab-scrollbar">
          <div class="media-container">
            <!-- Left Column -->
            <div class="media-column left-column">
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
                    <img src="/icons/plus.svg" alt="Path" class="btn-icon" />
                  </button>
                  <button class="action-btn" title="Add from URL">
                    <img src="/icons/link.svg" alt="URL" class="btn-icon" />
                  </button>
                  <button class="action-btn" title="Remove" @click="removeImage('icon')">
                    <img src="/icons/trash-2.svg" alt="Remove" class="btn-icon" />
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
                    <img src="/icons/plus.svg" alt="Path" class="btn-icon" />
                  </button>
                  <button class="action-btn" title="Add from URL">
                    <img src="/icons/link.svg" alt="URL" class="btn-icon" />
                  </button>
                  <button class="action-btn" title="Remove" @click="removeImage('background')">
                    <img src="/icons/trash-2.svg" alt="Remove" class="btn-icon" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Right Column -->
            <div class="media-column right-column">
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
                    <img src="/icons/plus.svg" alt="Path" class="btn-icon" />
                  </button>
                  <button class="action-btn" title="Add from URL">
                    <img src="/icons/link.svg" alt="URL" class="btn-icon" />
                  </button>
                  <button class="action-btn" title="Remove" @click="removeImage('cover')">
                    <img src="/icons/trash-2.svg" alt="Remove" class="btn-icon" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </el-scrollbar>
      </el-tab-pane>

      <!-- Links Tab -->
      <el-tab-pane label="Links" name="links">
        <el-scrollbar class="tab-scrollbar">
          <el-form :model="gameForm" label-width="120px" class="tab-form">
            <div class="links-container">
              <div class="links-header">
                <h3>Game Links</h3>
                <el-button type="primary" :icon="Plus" @click="addLink">Add Link</el-button>
              </div>

              <div v-if="gameForm.links && gameForm.links.length > 0" class="links-list">
                <div v-for="(link, index) in gameForm.links" :key="index" class="link-item">
                  <div class="link-header">
                    <div class="link-index">{{ index + 1 }}</div>
                    <el-button type="danger" size="small" :icon="Delete" @click="removeLink(index)" circle />
                  </div>

                  <el-form-item label="Link Name" :prop="`links.${index}.name`">
                    <el-input v-model="link.name" placeholder="Enter link name (e.g., VNDB, Official Site)" />
                  </el-form-item>

                  <el-form-item label="URL" :prop="`links.${index}.url`">
                    <el-input v-model="link.url" placeholder="Enter URL (e.g., https://vndb.org/...)" />
                  </el-form-item>
                </div>
              </div>

              <div v-else class="no-links">
                <p>No links added yet</p>
                <p class="hint-text">Add links to external sites like VNDB, official websites, etc.</p>
              </div>
            </div>
          </el-form>
        </el-scrollbar>
      </el-tab-pane>

      <!-- Actions Tab -->
      <el-tab-pane label="Actions" name="actions">
        <el-scrollbar class="tab-scrollbar">
          <el-form :model="gameForm" label-width="120px" class="tab-form">
            <div class="actions-container">
              <div class="actions-header">
                <h3>Game Actions</h3>
                <el-button type="primary" size="small" @click="addAction">
                  <el-icon>
                    <Plus />
                  </el-icon>
                  Add Action
                </el-button>
              </div>

              <div v-if="gameForm.actions && gameForm.actions.length > 0" class="actions-list">
                <div v-for="(action, index) in gameForm.actions" :key="index" class="action-item">
                  <div class="action-header">
                    <span class="action-index">{{ index + 1 }}</span>
                    <el-button type="danger" size="small" text @click="removeAction(index)">
                      <el-icon>
                        <Delete />
                      </el-icon>
                    </el-button>
                  </div>

                  <el-form-item label="Action Name">
                    <el-input v-model="action.name" placeholder="Enter action name (e.g., Play)" />
                  </el-form-item>

                  <el-form-item label="Type">
                    <el-select v-model="action.type" placeholder="Select action type" style="width: 100%">
                      <el-option label="File" value="File" />
                      <el-option label="Link" value="Link" disabled />
                      <el-option label="Script" value="Script" disabled />
                    </el-select>
                  </el-form-item>

                  <el-form-item v-if="action.type === 'File'" label="Executable Path">
                    <div class="executable-path-input">
                      <el-input v-model="action.executablePath" placeholder="Path to executable file" />
                      <el-button @click="selectExecutablePath(index)" style="margin-left: 8px;">
                        Browse
                      </el-button>
                    </div>
                  </el-form-item>

                  <el-form-item v-if="action.type === 'File'" label="Parameters">
                    <el-input v-model="action.parameters"
                      placeholder="Optional command line parameters (NOT AVAILAVLE YET)" />
                  </el-form-item>
                </div>
              </div>

              <div v-else class="no-actions">
                <el-empty description="No actions configured" />
                <p class="hint-text">Add actions to define how to launch or interact with this game.</p>
              </div>
            </div>
          </el-form>
        </el-scrollbar>
      </el-tab-pane>

      <!-- Script Tab (TODO) -->
      <el-tab-pane label="Script" name="script">
        <el-scrollbar class="tab-scrollbar">
          <div class="placeholder-content">
            <el-empty description="Script configuration coming soon..." />
          </div>
        </el-scrollbar>
      </el-tab-pane>
    </el-tabs>

    <!-- Buttons fixed at the bottom -->
    <div class="fixed-buttons">
      <el-button type="primary" @click="saveGame" :loading="saving">Save</el-button>
      <el-button @click="closeWindow">Cancel</el-button>
    </div>
  </div>
</template>

<script setup lang="ts" name="GameEditForm">
  import { ref, onMounted, computed, toRaw } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Plus, Delete, InfoFilled } from '@element-plus/icons-vue'
  import { useGameStore } from '../stores/game'
  import { PROC_MON_MODE } from '../constants/procMonMode'

  // Use game store
  const gameStore = useGameStore()

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
    lastPlayed: '',
    timePlayed: 0,
    workingDir: '',
    folderSize: 0,
    genre: '',
    developer: '',
    publisher: '',
    releaseDate: '',
    communityScore: 0,
    personalScore: 0,
    tags: [],
    links: [],
    description: [],
    actions: [],
    procMonMode: 1,  // Default to folder mode
    procNames: []    // Default to empty array
  })

  const saving = ref(false)

  // Image preview states
  const iconPreview = ref('')
  const backgroundPreview = ref('')
  const coverPreview = ref('')

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
        ElMessage.error('File selection API not available')
      }
    } catch (error) {
      console.error('Error selecting image:', error)
      ElMessage.error('Failed to select image')
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

          ElMessage.success(`${imageType} image updated successfully!`)
        } else {
          ElMessage.error(result.error || 'Failed to process image')
        }
      } else {
        ElMessage.error('Image processing API not available')
      }
    } catch (error) {
      console.error('Error processing image:', error)
      ElMessage.error('Failed to process image')
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
    ElMessage.success(`${imageType} image removed`)
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
    ElMessage.success('Action added')
  }

  function removeAction(index: number) {
    if (gameForm.value.actions && index >= 0 && index < gameForm.value.actions.length) {
      gameForm.value.actions.splice(index, 1)
      ElMessage.success('Action removed')
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
            ElMessage.success('Executable path updated')
          }
        }
      } else {
        ElMessage.error('File selection API not available')
      }
    } catch (error) {
      console.error('Error selecting executable:', error)
      ElMessage.error('Failed to select executable')
    }
  }

  async function selectworkingDir() {
    try {
      if (window.electronAPI?.selectFolder) {
        const result = await window.electronAPI.selectFolder()

        if (result && !result.canceled && result.filePaths.length > 0) {
          const selectedPath = result.filePaths[0]
          gameForm.value.workingDir = selectedPath
          ElMessage.success('Install path updated')
        }
      } else {
        ElMessage.error('Folder selection API not available')
      }
    } catch (error) {
      console.error('Error selecting folder:', error)
      ElMessage.error('Failed to select folder')
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
    ElMessage.success('Link added')
  }

  function removeLink(index: number) {
    if (gameForm.value.links && index >= 0 && index < gameForm.value.links.length) {
      gameForm.value.links.splice(index, 1)
      ElMessage.success('Link removed')
    }
  }

  // Process names management functions
  function addProcessName() {
    if (!gameForm.value.procNames) {
      gameForm.value.procNames = []
    }
    gameForm.value.procNames.push('')
    ElMessage.success('Process name added')
  }

  function removeProcessName(index: number) {
    if (gameForm.value.procNames && index >= 0 && index < gameForm.value.procNames.length) {
      gameForm.value.procNames.splice(index, 1)
      ElMessage.success('Process name removed')
    }
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
  }  // deal with tags input
  const tagsInput = computed({
    get: () => gameForm.value.tags.join(', '),
    set: (value: string) => {
      gameForm.value.tags = value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
    }
  })

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
      ElMessage.success('Game information saved successfully!')

      // delay close window
      setTimeout(() => {
        closeWindow()
      }, 1000)
    } catch (error) {
      console.error('Save Error:', error)
      ElMessage.error('Failed to save game information')
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
        gameForm.value.lastPlayed = data.lastPlayed || ''
        gameForm.value.timePlayed = data.timePlayed || 0
        gameForm.value.workingDir = data.workingDir || ''
        gameForm.value.folderSize = data.folderSize || 0
        gameForm.value.genre = data.genre || ''
        gameForm.value.developer = data.developer || ''
        gameForm.value.publisher = data.publisher || ''
        gameForm.value.releaseDate = data.releaseDate || ''
        gameForm.value.communityScore = data.communityScore || 0
        gameForm.value.personalScore = data.personalScore || 0
        gameForm.value.tags = Array.isArray(data.tags) ? data.tags : []
        gameForm.value.description = Array.isArray(data.description) ? data.description : []
        gameForm.value.links = Array.isArray(data.links) ? data.links : []
        gameForm.value.actions = Array.isArray(data.actions) ? data.actions : []
        gameForm.value.procMonMode = data.procMonMode ?? PROC_MON_MODE.FOLDER  // Default to folder mode
        gameForm.value.procNames = Array.isArray(data.procNames) ? data.procNames : []  // Default to empty array
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
    background-color: #ffffff;
    display: flex;
    flex-direction: column;
  }

  .tabs-container {
    flex: 1;
    background-color: transparent;
    padding: 0;
    /* space for button */
    margin-bottom: 80px;
    display: flex;
    flex-direction: column;
  }

  .tab-scrollbar {
    /* Subtract the height of the tab header and bottom buttons */
    height: calc(100vh - 160px);
  }

  .tab-form {
    padding: 30px;
    background-color: #ffffff;
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
    background-color: white;
    border-top: 1px solid #e4e7ed;
    padding: 15px 20px;
    display: flex;
    justify-content: center;
    gap: 15px;
    z-index: 100;
  }

  /* Element Plus component style customization */
  :deep(.el-tabs__header) {
    margin: 0;
    background-color: #ffffff;
    border-bottom: 1px solid #e4e7ed;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  :deep(.el-tabs__nav-wrap) {
    padding: 0 30px;
  }

  :deep(.el-tabs__content) {
    padding: 0;
    background-color: #ffffff;
    flex: 1;
    /* Prevent default scrollbar from appearing */
    overflow: hidden;
  }

  /* El-scrollbar customization */
  :deep(.el-scrollbar__view) {
    height: 100%;
  }

  :deep(.el-scrollbar__bar) {
    opacity: 0.6;
  }

  :deep(.el-scrollbar__bar:hover) {
    opacity: 1;
  }

  :deep(.el-scrollbar__thumb) {
    background-color: #c1c4cd;
    border-radius: 4px;
  }

  :deep(.el-scrollbar__thumb:hover) {
    background-color: #a6a9ad;
  }

  :deep(.el-form-item__label) {
    color: #606266;
    font-weight: 500;
  }

  :deep(.el-input__wrapper) {
    border-radius: 6px;
  }

  :deep(.el-textarea__inner) {
    border-radius: 6px;
    /* Disable native scrollbar */
    overflow: hidden;
  }

  :deep(.el-button) {
    border-radius: 6px;
    padding: 12px 24px;
  }

  :deep(.el-tabs__item) {
    font-weight: 500;
  }

  :deep(.el-tabs__item.is-active) {
    color: #409eff;
  }

  /* Link icon styles */
  :deep(.el-input-group__prepend) {
    background-color: #f5f7fa;
  }

  /* Media tab specific styles */
  .media-container {
    display: flex;
    gap: 0;
    padding: 0 10px;
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
    color: #303133;
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
    background-color: #f8f9fa;
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
    background-color: #ffffff;
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
    background-color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
  }

  .action-btn:hover {
    border-color: #409eff;
    background-color: #ecf5ff;
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
    color: #303133;
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
    background-color: #fafafa;
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
    color: #303133;
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
    background-color: #fafafa;
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
