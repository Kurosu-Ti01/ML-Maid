import { createApp } from "vue"
import App from './App.vue'
import router from './router'
import pinia from './stores'
import 'element-plus/dist/index.css'

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

createApp(App).use(router).use(pinia).mount('#app')