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
async function initTitlebar() {
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

        // Create vertical divider
        const divider = document.createElement('div')
        divider.className = 'titlebar-divider'

        // Add "Add Game" button
        const addGameButton = document.createElement('button')
        addGameButton.className = 'titlebar-button'
        addGameButton.title = 'Add' // tooltip
        addGameButton.innerHTML = `
          <img src="icons/AddOutlined.svg" width="30" height="30" alt="Add">
        `
        addGameButton.onclick = () => {
          if (window.electronAPI) {
            window.electronAPI.createAddGameWindow();
          }
        }
        buttonsContainer.appendChild(addGameButton)

        // Check if filters are active
        let activeFilterCount = 0
        try {
          const settings = await window.electronAPI?.getSettings()
          if (settings?.filtering) {
            const { genres, developers, publishers, tags } = settings.filtering
            if (genres?.length > 0) activeFilterCount++
            if (developers?.length > 0) activeFilterCount++
            if (publishers?.length > 0) activeFilterCount++
            if (tags?.length > 0) activeFilterCount++
          }
        } catch (error) {
          console.error('Failed to get settings for filter status:', error)
        }

        // Add Filter button with dynamic state
        const filterButton = document.createElement('button')
        filterButton.className = activeFilterCount > 0 ? 'titlebar-button titlebar-button-active' : 'titlebar-button'
        filterButton.title = activeFilterCount > 0 ? `${activeFilterCount} active filter(s)` : 'Filter'

        if (activeFilterCount > 0) {
          filterButton.innerHTML = `
            <img src="icons/FilterAltOffOutlined.svg" width="30" height="30" alt="Filter Active">
            <span class="filter-badge">Active filters: ${activeFilterCount}</span>
          `
        } else {
          filterButton.innerHTML = `
            <img src="icons/FilterAltOutlined.svg" width="30" height="30" alt="Filter">
          `
        }

        filterButton.onclick = () => {
          window.dispatchEvent(new CustomEvent('open-filter-dialog'))
        }
        buttonsContainer.appendChild(filterButton)

        // Append title and buttons to titlebar
        titlebar.appendChild(titleElement)
        titlebar.appendChild(divider)
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

// Listen for filter changes to update titlebar
window.addEventListener('filters-updated', initTitlebar)

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