import { createApp } from "vue"
import App from './App.vue'
import router from './router'
import pinia from './stores'
import i18n from './i18n'
const t = i18n.global.t
import { useSettingsStore } from './stores/settings'
import { api } from './api'
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

// The window runs with decorations disabled, so the titlebar provides its own
// drag region and window control buttons
async function applyTitlebarWindowControls(titlebar: HTMLElement) {
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

// ---- Titlebar filter button ----
// The button reflects both the saved filters (settings) and the live search
// box; it re-renders in place so typing in the search box never rebuilds
// (and un-focuses) the titlebar.
let currentSearchQuery = ''
let titlebarFiltering: Settings['filtering'] | null = null
let titlebarFilterButton: HTMLButtonElement | null = null

// icons/FilterAltOutlined.svg
const FILTER_ICON = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24"><path d="M7 6h10l-5.01 6.3L7 6zm-2.75-.39C6.27 8.2 10 13 10 13v6c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-6s3.72-4.8 5.74-7.39A.998.998 0 0 0 18.95 4H5.04c-.83 0-1.3.95-.79 1.61z" fill="currentColor"></path></svg>`
// icons/FilterAltOffOutlined.svg
const FILTER_OFF_ICON = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24"><path d="M16.95 6l-3.57 4.55l1.43 1.43c1.03-1.31 4.98-6.37 4.98-6.37A.998.998 0 0 0 19 4H6.83l2 2h8.12zM2.81 2.81L1.39 4.22L10 13v6c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-2.17l5.78 5.78l1.41-1.41L2.81 2.81z" fill="currentColor"></path></svg>`
// icons/CloseOutlined.svg
const CLEAR_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41z" fill="currentColor"></path></svg>`

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string
  ))
}

// Re-render the filter button from the cached filtering state + search query
function renderFilterButton() {
  const btn = titlebarFilterButton
  if (!btn) return

  // One tooltip line per active filter category (plus the search query)
  const active: { label: string; values: string }[] = []
  const f = titlebarFiltering
  if (f?.genres?.length) active.push({ label: t('gameForm.fields.genre'), values: f.genres.join(', ') })
  if (f?.developers?.length) active.push({ label: t('gameForm.fields.developer'), values: f.developers.join(', ') })
  if (f?.publishers?.length) active.push({ label: t('gameForm.fields.publisher'), values: f.publishers.join(', ') })
  if (f?.tags?.length) active.push({ label: t('gameForm.fields.tags'), values: f.tags.join(', ') })
  const search = currentSearchQuery.trim()
  if (search) active.push({ label: t('titlebar.search'), values: search })

  if (active.length === 0) {
    btn.className = 'titlebar-button'
    btn.title = t('titlebar.filter')
    btn.innerHTML = FILTER_ICON
    return
  }

  btn.className = 'titlebar-button titlebar-button-active'
  btn.removeAttribute('title') // replaced by the custom hover tooltip
  const tooltipLines = active
    .map(item => `<div class="filter-tooltip-line"><span class="filter-tooltip-label">${escapeHtml(item.label)}</span>${escapeHtml(item.values)}</div>`)
    .join('')
  btn.innerHTML = `
    ${FILTER_OFF_ICON}
    <span class="filter-badge">${escapeHtml(t('titlebar.activeFiltersLabel', { count: active.length }))}</span>
    <span class="filter-clear-btn" role="button" title="${escapeHtml(t('titlebar.clearFilters'))}">${CLEAR_ICON}</span>
    <div class="filter-tooltip">${tooltipLines}</div>
  `

  // The embedded ✕ clears everything instead of opening the dialog
  btn.querySelector('.filter-clear-btn')?.addEventListener('click', (e) => {
    e.stopPropagation()
    // Clear the search box locally (programmatic .value changes fire no event)
    currentSearchQuery = ''
    const input = document.querySelector<HTMLInputElement>('.titlebar-search-input')
    if (input) input.value = ''
    window.dispatchEvent(new CustomEvent('search-games', { detail: '' }))
    // Ask the app to wipe the saved filters; App.vue saves settings and then
    // fires 'filters-updated', which rebuilds this titlebar in inactive state
    window.dispatchEvent(new CustomEvent('clear-filters'))
  })
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

        // Cache the saved filtering state for the filter button + its tooltip
        try {
          const settings = await api.getSettings()
          titlebarFiltering = settings?.filtering ?? null
        } catch (error) {
          console.error('Failed to get settings for filter status:', error)
          titlebarFiltering = null
        }

        // Add Filter button (click opens the dialog; the embedded ✕ clears)
        const filterButton = document.createElement('button')
        filterButton.onclick = () => {
          window.dispatchEvent(new CustomEvent('open-filter-dialog'))
        }
        titlebarFilterButton = filterButton
        renderFilterButton()
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
        // Titlebar rebuilds (e.g. 'filters-updated') must not wipe the query
        searchInput.value = currentSearchQuery

        // Dispatch search event when input changes
        searchInput.addEventListener('input', (e) => {
          const query = (e.target as HTMLInputElement).value
          currentSearchQuery = query
          window.dispatchEvent(new CustomEvent('search-games', { detail: query }))
          renderFilterButton() // an active search lights the filter button too
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
        titlebarFilterButton = null
        break
    }

    await applyTitlebarWindowControls(titlebar)
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