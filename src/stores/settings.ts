import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/api'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings>({
    general: {
      theme: 'auto',
      language: 'en-US',
      minimizeToTray: true
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
      await api.saveSettings(newSettings)
      console.log('Settings saved successfully')
      return true
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

