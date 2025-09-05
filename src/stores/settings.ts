import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings>({
    general: {
      theme: 'light',
      language: 'en-US'
    }
  })

  function updateSettings(newSettings: Settings) {
    settings.value = newSettings
  }

  async function saveSettings(newSettings: Settings) {
    try {
      // Update store
      updateSettings(newSettings)

      // Save to file via IPC
      if (window.electronAPI?.saveSettings) {
        await window.electronAPI.saveSettings(newSettings)
        console.log('Settings saved successfully')
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to save settings:', error)
      return false
    }
  }

  return {
    settings,
    updateSettings,
    saveSettings
  }
})

