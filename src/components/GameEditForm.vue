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
              <el-input v-model="gameForm.installPath" placeholder="Game installation path" />
            </el-form-item>

            <!-- Install Size and Time Played in one row -->
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="Install Size">
                  <el-input v-model="gameForm.installSize" placeholder="Installation size in bytes" type="number" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="Time Played">
                  <el-input v-model="gameForm.timePlayed" placeholder="Time played in minutes" type="number" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="Last Played">
              <el-date-picker v-model="gameForm.lastPlayed" type="date" placeholder="Select last played date"
                format="YYYY-MM-DD" value-format="YYYY-MM-DD" style="width: 100%;" />
            </el-form-item>
          </el-form>
        </el-scrollbar>
      </el-tab-pane>

      <!-- Media Tab -->
      <el-tab-pane label="Media" name="media">
        <el-scrollbar class="tab-scrollbar">
          <el-form :model="gameForm" label-width="120px" class="tab-form">
            <el-form-item label="Cover Image">
              <el-input v-model="gameForm.coverImage" placeholder="Path to cover image" />
              <div class="file-hint">Recommended size: 460x215</div>
            </el-form-item>

            <el-form-item label="Background Image">
              <el-input v-model="gameForm.backgroundImage" placeholder="Path to background image" />
              <div class="file-hint">Recommended size: 1920x1080</div>
            </el-form-item>

            <el-form-item label="Icon Image">
              <el-input v-model="gameForm.iconImage" placeholder="Path to icon image" />
              <div class="file-hint">Recommended size: 256x256</div>
            </el-form-item>
          </el-form>
        </el-scrollbar>
      </el-tab-pane>

      <!-- Links Tab -->
      <el-tab-pane label="Links" name="links">
        <el-scrollbar class="tab-scrollbar">
          <el-form :model="gameForm" label-width="120px" class="tab-form">
            <el-form-item label="批評空間">
              <el-input v-model="gameForm.links.批評空間" placeholder="批評空間 URL" />
            </el-form-item>

            <el-form-item label="VNDB">
              <el-input v-model="gameForm.links.VNDB" placeholder="VNDB URL" />
            </el-form-item>

            <el-form-item label="Bangumi">
              <el-input v-model="gameForm.links.Bangumi" placeholder="Bangumi URL" />
            </el-form-item>

            <el-form-item label="WikiPedia">
              <el-input v-model="gameForm.links.WikiPedia" placeholder="Wikipedia URL" />
            </el-form-item>

            <el-form-item label="WikiData">
              <el-input v-model="gameForm.links.WikiData" placeholder="WikiData URL" />
            </el-form-item>
          </el-form>
        </el-scrollbar>
      </el-tab-pane>

      <!-- Actions Tab (TODO) -->
      <el-tab-pane label="Actions" name="actions">
        <el-scrollbar class="tab-scrollbar">
          <div class="placeholder-content">
            <el-empty description="Actions configuration coming soon..." />
          </div>
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

<script setup lang="ts">
  import { ref, onMounted, computed, toRaw } from 'vue'
  import { ElMessage } from 'element-plus'

  // Active tab
  const activeTab = ref('general')

  const gameForm = ref<gameData>({
    uuid: '',
    title: '',
    coverImage: '',
    backgroundImage: '',
    iconImage: '',
    lastPlayed: '',
    timePlayed: 0,
    installPath: '',
    installSize: 0,
    genre: '',
    developer: '',
    publisher: '',
    releaseDate: '',
    communityScore: 0,
    personalScore: 0,
    tags: [],
    links: {
      '批評空間': '',
      'VNDB': '',
      'Bangumi': '',
      'WikiPedia': '',
      'WikiData': ''
    },
    description: []
  })

  const saving = ref(false)

  // deal with tags input
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

      // Call electron API to save to database
      if (window.electronAPI?.updateGame && gameForm.value.uuid) {
        // Convert reactive object to plain object to avoid cloning issues
        const plainGameData = toRaw(gameForm.value)
        console.log('Plain game data:', plainGameData)
        await window.electronAPI.updateGame(plainGameData)
        ElMessage.success('Game information saved successfully!')

        // delay close window
        setTimeout(() => {
          closeWindow()
        }, 1000)
      } else {
        console.error('electronAPI updateGame not available or game UUID missing')
        ElMessage.error('Unable to save: API not available or game ID missing')
      }
    } catch (error) {
      console.error('Save Error:', error)
      ElMessage.error('Failed to save game information')
    } finally {
      saving.value = false
    }
  }

  // close the edit window
  const closeWindow = () => {
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
        gameForm.value.installPath = data.installPath || ''
        gameForm.value.installSize = data.installSize || 0
        gameForm.value.genre = data.genre || ''
        gameForm.value.developer = data.developer || ''
        gameForm.value.publisher = data.publisher || ''
        gameForm.value.releaseDate = data.releaseDate || ''
        gameForm.value.communityScore = data.communityScore || 0
        gameForm.value.personalScore = data.personalScore || 0
        gameForm.value.tags = Array.isArray(data.tags) ? data.tags : []
        gameForm.value.description = Array.isArray(data.description) ? data.description : []
        gameForm.value.links = {
          '批評空間': data.links?.['批評空間'] || '',
          'VNDB': data.links?.VNDB || '',
          'Bangumi': data.links?.Bangumi || '',
          'WikiPedia': data.links?.WikiPedia || '',
          'WikiData': data.links?.WikiData || ''
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
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
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
  }
</style>
