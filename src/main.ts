import { createApp } from "vue"
import App from './App.vue'
import router from './router'
import pinia from './stores'
import { useSettingsStore } from './stores/settings'
import './styles/base.css'
import './styles/dark-theme.css'

// Configure Day.js for date components
import dayjs from 'dayjs'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(weekOfYear)
dayjs.extend(isoWeek)

// Set locale to ensure Monday is first day of week (ISO 8601 standard)
dayjs.locale({
  ...dayjs.Ls.en,
  weekStart: 1 // Monday = 1, Sunday = 0
})

// initialize the title bar based on the current route
function initTitlebar() {
  const titlebar = document.getElementById('titlebar')
  if (titlebar) {
    const currentRoute = window.location.hash

    // Normalize the route path by removing query parameters
    const routePath = currentRoute.split('?')[0]

    switch (routePath) {
      case '':
      case '#':
      case '#/':
        // Main-window titlebar
        titlebar.innerHTML = ''
        titlebar.className = 'titlebar main-titlebar'

        // Create title element
        const titleElement = document.createElement('div')
        titleElement.className = 'titlebar-title'
        titleElement.innerHTML = `
          <img src="default/ML-Maid-Icon-M.png" alt="ML-Maid Icon">
          <span>ML-Maid</span>
        `

        // Create buttons container
        const buttonsContainer = document.createElement('div')
        buttonsContainer.className = 'titlebar-buttons'

        // Add "Add Game" button
        const addGameButton = document.createElement('button')
        addGameButton.className = 'titlebar-button'
        addGameButton.title = 'Add Game' // tooltip
        addGameButton.innerHTML = `
          <img src="icons/plus-square.svg" width="20" height="20" alt="Add Game" style="filter: brightness(0) invert(1);">
        `
        addGameButton.onclick = () => {
          if (window.electronAPI) {
            window.electronAPI.createAddGameWindow();
          }
        }
        buttonsContainer.appendChild(addGameButton)

        // Add "Sort" button
        const sortButton = document.createElement('button')
        sortButton.className = 'titlebar-button'
        sortButton.title = 'Sort Games'
        sortButton.innerHTML = `
          <img src="icons/sort.svg" width="20" height="20" alt="Sort" style="filter: brightness(0) invert(1);">
        `
        sortButton.onclick = () => {
          window.dispatchEvent(new CustomEvent('open-sort-dialog'))
        }
        buttonsContainer.appendChild(sortButton)

        // Append title and buttons to titlebar
        titlebar.appendChild(titleElement)
        titlebar.appendChild(buttonsContainer)
        break

      case '#/edit':
        // edit-window titlebar
        titlebar.textContent = 'Edit Game'
        titlebar.className = 'titlebar edit-titlebar'
        break

      case '#/add':
        // add-game-window titlebar
        titlebar.textContent = 'Add Game'
        titlebar.className = 'titlebar add-titlebar'
        break

      default:
        // fallback for other routes
        titlebar.textContent = 'ML-Maid'
        titlebar.className = 'titlebar main-titlebar'
        break
    }
  }
}

// initialize the title bar
initTitlebar()

// Listen for hash changes to update titlebar when navigating
window.addEventListener('hashchange', initTitlebar)

const app = createApp(App).use(router).use(pinia)

// Initialize settings store and listen for initial settings from main process
const settingsStore = useSettingsStore()

// // Listen for initial settings from main process
// if (window.electronAPI?.onSettingsInitial) {
//   window.electronAPI.onSettingsInitial((settings: any) => {
//     settingsStore.updateSettings(settings)
//   })
// }

// Await fetch user settings from main process on startup
// Make sure ever use settings.conf never use default settings
const userSettings = await window.electronAPI?.getSettings()
settingsStore.updateSettings(userSettings)

app.mount('#app')