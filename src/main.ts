import { createApp } from "vue"
import App from './App.vue'
import router from './router'
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
        // main-window titlebar (root path)
        titlebar.textContent = 'ML-Maid'
        titlebar.className = 'titlebar main-titlebar'
        break
      
      case '#/edit':
        // edit-window titlebar
        titlebar.textContent = 'Edit Game'
        titlebar.className = 'titlebar edit-titlebar'
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

createApp(App).use(router).mount('#app')