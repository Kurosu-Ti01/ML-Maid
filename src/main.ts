import { createApp } from "vue"
import App from './App.vue'
import router from './router'
import pinia from './stores'
import i18n from './i18n'
const t = i18n.global.t
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
        buttonsContainer.className = 'titlebar-buttons-container'

        // Create vertical divider
        const divider = document.createElement('div')
        divider.className = 'titlebar-divider'

        // Add "Add Game" button
        const addGameButton = document.createElement('button')
        addGameButton.className = 'titlebar-button'
        addGameButton.title = t('titlebar.add') // tooltip
        // icons/AddOutlined.svg
        addGameButton.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"></path></svg>
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
        filterButton.title = activeFilterCount > 0 ? t('titlebar.activeFilters', { count: activeFilterCount }) : t('titlebar.filter')

        if (activeFilterCount > 0) {
          // icons/FilterAltOffOutlined.svg
          filterButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24"><path d="M16.95 6l-3.57 4.55l1.43 1.43c1.03-1.31 4.98-6.37 4.98-6.37A.998.998 0 0 0 19 4H6.83l2 2h8.12zM2.81 2.81L1.39 4.22L10 13v6c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-2.17l5.78 5.78l1.41-1.41L2.81 2.81z" fill="currentColor"></path></svg>
            <span class="filter-badge">${t('titlebar.activeFiltersLabel', { count: activeFilterCount })}</span>
          `
        } else {
          // icons/FilterAltOutlined.svg
          filterButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24"><path d="M7 6h10l-5.01 6.3L7 6zm-2.75-.39C6.27 8.2 10 13 10 13v6c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-6s3.72-4.8 5.74-7.39A.998.998 0 0 0 18.95 4H5.04c-.83 0-1.3.95-.79 1.61z" fill="currentColor"></path></svg>
          `
        }

        filterButton.onclick = () => {
          window.dispatchEvent(new CustomEvent('open-filter-dialog'))
        }
        buttonsContainer.appendChild(filterButton)

        // Add Search box
        const searchContainer = document.createElement('div')
        searchContainer.className = 'titlebar-search-container'

        const searchInput = document.createElement('input')
        searchInput.type = 'text'
        searchInput.className = 'titlebar-search-input'
        searchInput.placeholder = t('titlebar.searchPlaceholder')

        // Dispatch search event when input changes
        searchInput.addEventListener('input', (e) => {
          const query = (e.target as HTMLInputElement).value
          window.dispatchEvent(new CustomEvent('search-games', { detail: query }))
        })

        searchContainer.appendChild(searchInput)

        // Append title, buttons, search to titlebar
        titlebar.appendChild(titleElement)
        titlebar.appendChild(divider)
        titlebar.appendChild(buttonsContainer)
        titlebar.appendChild(searchContainer)
        break

      case '#/edit':
        // edit-window titlebar
        titlebar.textContent = t('titlebar.editGame')
        titlebar.className = 'titlebar edit-titlebar'
        break

      case '#/add':
        // add-game-window titlebar
        titlebar.textContent = t('titlebar.addGame')
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

const app = createApp(App).use(router).use(pinia).use(i18n)

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