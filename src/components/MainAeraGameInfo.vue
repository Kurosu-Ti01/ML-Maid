<template>
  <el-scrollbar>
    <div v-if="isLoading" class="loading-container" v-loading="true" element-loading-text="Loading game data...">
      <!-- Loading content will be handled by v-loading directive -->
    </div>
    <div v-else-if="(!gameStore.currentGameUuid) || (!gameData)" class="no-game-container">
      <div class="no-game-text">
        <p>No game selected</p>
        <span class="no-game-hint">Please select a game from the sidebar</span>
      </div>
    </div>
    <div v-else>
      <!-- Background & Title Container-->
      <div class="background-title-container">
        <img :src="gameData.backgroundImage" alt="Game Background" class="game-background" />
        <!-- Icon & Title Container -->
        <div class="icon-title-container">
          <img src="/images/icon.ico" alt="Game Icon" class="game-icon" />
          <span class="game-title">{{ gameData.title }}</span>
        </div>
      </div>
      <!-- Main Info & Actions Container  -->
      <div class="main-info-action-container">
        <!-- Action Button Container -->
        <div class="action-button-container">
          <div class="button-group">
            <el-button type="primary" size="large" style="margin: 10px 5px; padding: 0 40px;"
              @click="handlePlayGame">Play</el-button>
            <el-button type="primary" size="large" style="margin: 10px 5px;" @click="openEditWindow">Edit</el-button>
            <el-dropdown trigger="click" @command="handleMenuCommand">
              <el-button type="primary" size="large" style="margin: 10px 5px;">
                ...
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="openFolder">
                    <el-icon>
                      <Folder />
                    </el-icon>
                    Open Install Path
                  </el-dropdown-item>
                  <el-dropdown-item command="createShortcut">
                    <el-icon>
                      <Link />
                    </el-icon>
                    Create Shortcut
                  </el-dropdown-item>
                  <el-dropdown-item command="gameInfo">
                    <el-icon>
                      <InfoFilled />
                    </el-icon>
                    Game Info
                  </el-dropdown-item>
                  <el-dropdown-item command="backup" divided>
                    <el-icon>
                      <Download />
                    </el-icon>
                    Backup Save
                  </el-dropdown-item>
                  <el-dropdown-item command="delete">
                    <el-icon>
                      <Delete />
                    </el-icon>
                    Delete
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <div class="game-playtime-text">
              <p>Time Played: {{ gameData.timePlayed }}</p>
              <p>Last Played: {{ gameData.lastPlayed }}</p>
            </div>
          </div>
        </div>
        <!-- Cover Container -->
        <div class="game-cover">
          <img :src="gameData.coverImage" alt="Game Cover">
        </div>
      </div>
      <!-- Detail Info & Description container -->
      <div class="info-row-container">
        <div class="detail-info-container">
          <div class="custom-info-table">
            <div class="info-row">
              <div class="info-label">Install Path</div>
              <div class="info-content">{{ gameData.installPath }}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Install Size</div>
              <div class="info-content">{{ gameData.installSize }}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Genre</div>
              <div class="info-content">{{ gameData.genre }}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Developer</div>
              <div class="info-content">{{ gameData.developer }}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Publisher</div>
              <div class="info-content">{{ gameData.publisher }}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Release Date</div>
              <div class="info-content">{{ gameData.releaseDate }}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Community Score</div>
              <div class="info-content">{{ gameData.communityScore }}</div>
            </div>
            <div class="info-row">
              <div class="info-label">User Score</div>
              <div class="info-content">{{ gameData.personalScore }}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Tags</div>
              <div class="info-content">
                <div class="tags-flex-wrap">
                  <el-tag v-for="(tag, index) in gameData.tags" :key="index" style="margin: 2px 6px 2px 0;">{{ tag
                  }}</el-tag>
                </div>
              </div>
            </div>
            <div class="info-row">
              <div class="info-label">Links</div>
              <div class="info-content">
                <div v-for="(link, name) in gameData.links" :key="name">
                  <a :href="link" target="_blank" class="game-link">{{ name }}</a>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="description-container">
          <el-card style="margin:10px;">
            <template #header>
              <span style="font-size: 1.5em; color: #409eff; font-weight: bold;">Description</span>
            </template>
            <p v-for="(line, index) in gameData.description" :key="index" class="description-text">{{ line }}</p>
          </el-card>
        </div>
      </div>
    </div>
  </el-scrollbar>
</template>

<script setup lang="ts" name="MainAeraGameInfo">
  import { ref, watch } from 'vue'
  import { useGameStore } from '../stores/game'
  import { Delete, Folder, Link, InfoFilled, Download } from '@element-plus/icons-vue'
  import { ElMessage, ElMessageBox } from 'element-plus'

  const gameStore = useGameStore()

  const gameData = ref<gameData | null>(null)
  const isLoading = ref(false)

  const defaultGameData: gameData = {
    uuid: 'c32503c7-039a-4d7d-a8e6-bd9ee030fb3d',
    title: 'WHITE ALBUM 2',
    coverImage: 'library/images/c32503c7-039a-4d7d-a8e6-bd9ee030fb3d/cover.jpg',
    backgroundImage: 'library/images/c32503c7-039a-4d7d-a8e6-bd9ee030fb3d/background.png',
    iconImage: 'library/images/c32503c7-039a-4d7d-a8e6-bd9ee030fb3d/icon.ico',
    lastPlayed: '2012-07-20 12:00:00',
    timePlayed: 192312412,
    installPath: 'C:/Amusement/WHITE ALBUM 2',
    installSize: 124164828731,
    genre: 'Visual Novel',
    developer: 'Leaf',
    publisher: 'AQUAPLUS',
    releaseDate: '2010-03-26',
    communityScore: 95,
    personalScore: 92,
    tags: [
      'Romance', 'University', 'Relationship Problems', 'Dramatic Love Triangle', 'Winter', 'Drama', 'Musical Themes',
      'University Student Protagonist', 'Adult Heroine', 'Instrumentalist Heroine', 'Sex with Protagonist Only',
      'Protagonist with Voice Acting', 'Multiple Endings', ' High School', 'High School Student Protagonist', 'Male Protagonist',
      'University Student Heroine', 'High School Student Heroine', 'Journalist Protagonist', 'More Than Seven Endings', 'Nakige',
      'Music Club', 'Musician Heroine', 'ADV', 'Insert Songs', 'Female Friend', 'Singer Heroine'
    ],
    links: {
      '批評空間': 'https://erogamescape.dyndns.org/~ap2/ero/toukei_kaiseki/game.php?game=13255',
      'VNDB': 'https://vndb.org/v7771',
      'Bangumi': 'https://bgm.tv/subject/22290',
      'WikiPedia': 'https://wikipedia.org/wiki/White_Album_2',
      'WikiData': 'https://www.wikidata.org/wiki/Q5960516'
    },
    description: [
      '~ Introductory Chapter ~',
      'Shivering from the cold wind, when the song was heard ......',
      'It\'s like it\'s trying to match the guitar melody I\'m playing in the classroom at sunset.',
      'It\'s like it\'s trying to match the piano melody played by someone I\'ve never met in the classroom next door.',
      'From the rooftop rings that voice as loud and clear as a bell, linking the scattered melodies of the three of us together.',
      'It started, it was in the late fall like that.',
      'Back then, someone was in love with someone.',
      'Whoever it is is fighting hard. Whoever is going forward with a strong heart. Whoever is single-minded, very purely and honestly ......',
      'Wanting to bond from the bottom of my heart and capture this irreplaceable moment.',
      'So at that point, someone fell in love with someone. It\'s a love affair that can\'t be one step too late.',
      'Then came the winter - the snow that fell from the sky and covered all sin.',
      'Soon spring arrives - along with the melting snow, all the punishments are coming. ',
      '',
      '--------- ---------- ---------',
      '~ Closing Chapter ~',
      'The cold wind blows and shivers, the song reaches the ears -',
      'The song that froze three years ago ......',
      'Had echoed in the sunset-stained campus, in the empty cafeteria, by the windows of the silent schoolhouse ......',
      'Sprouted in passion, sublimated in sheer longing, only to dissipate in the end as a song of deception.',
      'That winter of three men walking together is far away, but the winter of one man and one man goes on week after week.',
      'The season comes to late fall.',
      'The ugly wounds caused by that year\'s broken bonds had not yet dried up, but the premonition of change to come was already upon us.',
      'Two lonely melodies attract and hurt each other, and brand new melodies will be called.',
      'A new winter will come soon.',
      'A winter without that person\'s company, a winter without her.',
      'Long ago I didn\'t know what a white album was. Because, I can no longer sing.',
      'Long ago there will be no more love that cannot be conveyed. For, I will no longer be in love.',
    ],
    actions: [{
      name: 'Play',
      type: 'File',
      executablePath: 'C:/Amusement/WHITE ALBUM 2/WA2.exe',
      parameters: ''
    }
    ]
  }

  // Load the current game data
  async function loadCurrentGameData() {
    if (!gameStore.currentGameUuid) {
      gameData.value = defaultGameData
      return
    }

    isLoading.value = true
    try {
      const data = await gameStore.loadGameDetail(gameStore.currentGameUuid)
      if (data) {
        gameData.value = data
      } else {
        // If no data found, use default data
        console.warn('No game data found for UUID:', gameStore.currentGameUuid)
        gameData.value = defaultGameData
      }
    } catch (error) {
      console.error('Failed to load game data:', error)
      gameData.value = defaultGameData
    } finally {
      isLoading.value = false
    }
  }

  // Watch for changes in currentGameUuid
  watch(
    () => gameStore.currentGameUuid,
    (newUuid) => {
      if (newUuid) {
        loadCurrentGameData()
      }
    },
    { immediate: true }
  )

  // Watch for changes in gameDetailsCache for the current game
  watch(
    () => gameStore.currentGameUuid ? gameStore.gameDetailsCache.get(gameStore.currentGameUuid) : null,
    (newGameData) => {
      if (newGameData && gameStore.currentGameUuid) {
        console.log('Game data updated in cache, refreshing display:', newGameData.title)
        gameData.value = newGameData
      }
    },
    { deep: true }
  )

  // Initialize with default data
  if (!gameData.value) {
    gameData.value = defaultGameData
  }

  // handle play game function
  async function handlePlayGame() {
    if (!gameData.value) {
      ElMessage.error('No game data available')
      return
    }

    try {
      // Show loading message
      const loadingMessage = ElMessage({
        message: 'Launching game...',
        type: 'info',
        duration: 0
      })

      // Launch the game using the electronAPI
      // First try to find a File type action
      let executablePath: string | undefined

      if (gameData.value.actions && gameData.value.actions.length > 0) {
        const fileAction = gameData.value.actions.find(action => action.type === 'File' && action.executablePath)
        if (fileAction && fileAction.executablePath) {
          executablePath = fileAction.executablePath
        }
      }

      if (!executablePath) {
        loadingMessage.close()
        ElMessage.error('No executable path configured. Please edit the game and add an action.')
        return
      }

      const result = await window.electronAPI?.launchGame({
        gameUuid: gameData.value.uuid,
        executablePath: executablePath
      })

      loadingMessage.close()

      if (result?.success) {
        ElMessage.success(`Game launched successfully!`)
        // Refresh the game data to update last played time
        await loadCurrentGameData()
      } else {
        ElMessage.error('Failed to launch game')
      }
    } catch (error) {
      console.error('Failed to launch game:', error)
      ElMessage.error('Failed to launch game: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  // open edit window function
  async function openEditWindow() {
    if (window.electronAPI?.createEditWindow && gameData.value) {
      try {
        // Pass a plain object to avoid IPC clone errors
        await window.electronAPI.createEditWindow(JSON.parse(JSON.stringify(gameData.value)))
      } catch (error) {
        console.error('Failed to open edit window:', error)
      }
    } else {
      console.error('electronAPI not available or no game data')
    }
  }

  // handle dropdown menu command
  async function handleMenuCommand(command: string) {
    switch (command) {
      case 'delete':
        await handleDeleteGame()
        break
      case 'openFolder':
        ElMessage.info('This function is not implemented yet')
        break
      case 'createShortcut':
        ElMessage.info('This is just a placeholder.\nMay not be implemented in the future.')
        break
      case 'gameInfo':
        ElMessage.info('This is just a placeholder.\nMay not be implemented in the future.')
        break
      case 'backup':
        ElMessage.info('This function is not implemented yet')
        break
      default:
        console.log('Unknown command:', command)
    }
  }

  // handle delete game with confirmation
  async function handleDeleteGame() {
    if (!gameData.value) {
      ElMessage.error('No game data available')
      return
    }

    try {
      await ElMessageBox.confirm(
        `Are you sure you want to delete the game <br>"${gameData.value.title}"?`,
        'Confirm Deletion',
        {
          confirmButtonText: 'Delete',
          cancelButtonText: 'Cancel',
          type: 'warning',
          confirmButtonClass: 'el-button--danger',
          // Lock the scroll will make the scroll background turn white
          lockScroll: false,
          dangerouslyUseHTMLString: true
        }
      )

      // Show loading message
      const loadingMessage = ElMessage({
        message: 'Deleting Game...',
        type: 'info',
        duration: 0
      })

      try {
        await gameStore.deleteGame(gameData.value.uuid)
        loadingMessage.close()
        ElMessage.success('Delete Game Successfully')

        // Clear current selection after deletion
        gameStore.currentGameUuid = null
        gameData.value = null
      } catch (error) {
        loadingMessage.close()
        console.error('Failed to delete game:', error)
        ElMessage.error('Failed to delete game: ' + (error instanceof Error ? error.message : '未知错误'))
      }
    } catch {
      // User cancelled the deletion
      console.log('User cancelled game deletion')
    }
  }
</script>

<style scoped>
  .background-title-container {
    position: relative;
    width: 100%;
    max-height: 70%;
    overflow: hidden;
  }

  .icon-title-container {
    position: absolute;
    height: 4em;
    width: auto;
    left: 9px;
    bottom: 9px;
    display: flex;
    align-items: center;
    z-index: 3;
  }

  .game-title {
    font-size: 2em;
    font-weight: 600;
    color: #ffffff;
    letter-spacing: 1px;
    text-shadow:
      4px 4px 16px rgba(34, 34, 34, 0.40),
      2px 2px 4px rgba(34, 34, 34, 0.28);
  }

  .game-icon {
    width: auto;
    height: 48px;
    vertical-align: middle;
  }

  .game-background {
    width: 100%;
    object-fit: cover;
    object-position: center center;
  }

  .main-info-action-container {
    position: relative;
    width: auto;
    height: auto;
    border-top: none;
    padding: 0
  }

  .action-button-container {
    position: relative;
    width: 100%;
    height: 100%;
    bottom: 0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.10);
    display: flex;
    align-items: center;
    justify-content: flex-start;
    background: rgba(255, 255, 255, 0.92);
    z-index: 1;
  }

  .button-group {
    display: flex;
    flex-direction: row;
    align-items: center;
    margin-left: 10px;
  }

  .game-playtime-text {
    width: auto;
    height: 100%;
    font-size: 0.85em;
    margin-left: 18px;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 16px;
  }

  .game-cover {
    position: absolute;
    right: 10px;
    bottom: 0;
    width: 25%;
    height: auto;
    z-index: 2;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    pointer-events: none;
  }

  .game-cover img {
    width: 100%;
    height: auto;
    object-fit: cover;
    border-radius: 4px;
    display: block;
    pointer-events: auto;
  }

  .info-row-container {
    display: flex;
    flex-direction: row;
    width: 100%;
    margin-top: 10px;
  }

  .detail-info-container {
    width: 40%;
    height: auto;
    margin: 0 5px;
  }

  .description-container {
    width: 60%;
    height: auto;
    margin: 0 5px;
  }

  .description-text {
    word-break: break-all;
    text-align: justify;
    margin: 2px 0;
    line-height: 1.7;
  }

  .tags-flex-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 6px;
    align-items: flex-start;
    margin: 2px 0;
  }

  .game-link {
    color: #409eff;
    text-decoration: none;
    font-weight: 500;
  }

  .custom-info-table {
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.12);
    margin: 10px 0 10px 10px;
  }

  .info-row {
    display: flex;
    border-bottom: 1px solid #ebeef5;
  }

  .info-row:last-child {
    border-bottom: none;
  }

  .info-label {
    width: 100px;
    min-width: 100px;
    padding: 12px;
    background-color: #fafafa;
    border-right: 1px solid #ebeef5;
    font: 1em;
    font-weight: 520;
    color: #4080ff;
    word-break: break-word;
    overflow-wrap: break-word;
  }

  .info-content {
    flex: 1;
    padding: 12px;
    background-color: #ffffff;
    font-size: 0.8em;
    word-break: break-word;
    overflow-wrap: break-word;
  }

  .loading-container,
  .no-game-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 300px;
    color: #666;
    font-size: 16px;
  }

  .no-game-text {
    text-align: center;
    opacity: 0.7;
  }

  .no-game-text p {
    font-size: 24px;
    font-weight: 600;
    margin: 0 0 8px 0;
    color: #909399;
    letter-spacing: 0.5px;
  }

  .no-game-hint {
    font-size: 14px;
    font-weight: 400;
    color: #c0c4cc;
    opacity: 0.8;
  }
</style>

<style>

  /* Hide overlay of ElMessageBox  */
  /* The overlay can't work on window controls */
  .el-overlay {
    background-color: transparent !important;
  }
</style>