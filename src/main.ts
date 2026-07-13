import { createApp } from "vue"
import App from './App.vue'
import router from './router'
import pinia from './stores'
import i18n from './i18n'
const t = i18n.global.t
import { useSettingsStore } from './stores/settings'
import { api, isTauri } from './api'
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

// Tauri runs with decorations disabled, so the titlebar must provide its own
// drag region and window control buttons (Electron supplies these natively
// via titleBarOverlay)
async function applyTauriTitlebarExtras(titlebar: HTMLElement) {
  if (!isTauri) return

  titlebar.setAttribute('data-tauri-drag-region', '')
  titlebar.querySelectorAll('.titlebar-title, .titlebar-title *, .titlebar-divider')
    .forEach(el => el.setAttribute('data-tauri-drag-region', ''))

  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  const win = getCurrentWindow()

  const controls = document.createElement('div')
  controls.className = 'titlebar-window-controls'

  const makeButton = (className: string, svgPath: string, onClick: () => void) => {
    const btn = document.createElement('button')
    btn.className = `titlebar-window-control ${className}`
    btn.innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10">${svgPath}</svg>`
    btn.onclick = onClick
    return btn
  }

  controls.appendChild(makeButton('minimize',
    '<path d="M0 5h10" stroke="currentColor" stroke-width="1" fill="none"/>',
    () => { win.minimize() }))
  controls.appendChild(makeButton('maximize',
    '<rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" stroke-width="1" fill="none"/>',
    () => { win.toggleMaximize() }))
  controls.appendChild(makeButton('close',
    '<path d="M0 0l10 10M10 0L0 10" stroke="currentColor" stroke-width="1" fill="none"/>',
    () => { win.close() }))

  titlebar.appendChild(controls)
}

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
          window.dispatchEvent(new CustomEvent('open-add-game'))
        }
        buttonsContainer.appendChild(addGameButton)

        // Check if filters are active
        let activeFilterCount = 0
        try {
          const settings = await api.getSettings()
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

        // Add search icon
        const searchIcon = document.createElement('div')
        searchIcon.className = 'titlebar-search-icon'
        searchIcon.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5A6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5S14 7.01 14 9.5S11.99 14 9.5 14z" fill="currentColor"></path></svg>
        `

        const searchInput = document.createElement('input')
        searchInput.type = 'text'
        searchInput.className = 'titlebar-search-input'
        searchInput.placeholder = t('titlebar.searchPlaceholder')

        // Dispatch search event when input changes
        searchInput.addEventListener('input', (e) => {
          const query = (e.target as HTMLInputElement).value
          window.dispatchEvent(new CustomEvent('search-games', { detail: query }))
        })

        searchContainer.appendChild(searchIcon)
        searchContainer.appendChild(searchInput)

        // Append title, buttons, search to titlebar
        titlebar.appendChild(titleElement)
        titlebar.appendChild(divider)
        titlebar.appendChild(buttonsContainer)
        titlebar.appendChild(searchContainer)
        break

      default:
        // fallback for other routes
        titlebar.textContent = 'ML-Maid'
        titlebar.className = 'titlebar main-titlebar'
        break
    }

    await applyTauriTitlebarExtras(titlebar)
  }
}

// initialize the title bar
initTitlebar()

// Listen for hash changes to update titlebar when navigating
window.addEventListener('hashchange', initTitlebar)

// Listen for filter changes to update titlebar
window.addEventListener('filters-updated', initTitlebar)

const app = createApp(App).use(router).use(pinia).use(i18n)

// Initialize settings store from main process
const settingsStore = useSettingsStore()

// Await fetch user settings from main process on startup
// Make sure ever use settings.conf never use default settings
try {
  const userSettings = await api.getSettings()
  settingsStore.updateSettings(userSettings)
} catch (error) {
  console.error('Failed to load settings on startup, using defaults:', error)
}

app.mount('#app')