import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api } from '@/api'
import type { InstalledPluginInfo, PluginManifestInfo } from '@/api'
import { disposeAllPluginWorkers, disposePluginWorker } from '@/plugins/manager'
import { useSettingsStore } from './settings'

export const PLUGIN_API_VERSION = 1

export const usePluginStore = defineStore('plugins', () => {
  const settingsStore = useSettingsStore()

  const plugins = ref<InstalledPluginInfo[]>([])
  const loading = ref(false)
  const loaded = ref(false)

  const disabledIds = computed(() => settingsStore.settings.plugins?.disabled ?? [])

  function isEnabled(id: string) {
    return !disabledIds.value.includes(id)
  }

  /** Type/apiVersion combinations this build knows how to run */
  function isSupported(manifest: PluginManifestInfo) {
    return manifest.type === 'metadata-scraper' && manifest.apiVersion === PLUGIN_API_VERSION
  }

  /** Data source for the scraper UI */
  const enabledScrapers = computed(() =>
    plugins.value.filter(p => isSupported(p.manifest) && isEnabled(p.manifest.id))
  )

  async function refresh() {
    loading.value = true
    try {
      // Re-reading scripts from disk only helps if stale workers are gone
      disposeAllPluginWorkers()
      plugins.value = await api.listPlugins()
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  async function ensureLoaded() {
    if (!loaded.value) await refresh()
  }

  async function setEnabled(id: string, enabled: boolean) {
    const disabled = new Set(disabledIds.value)
    if (enabled) {
      disabled.delete(id)
    } else {
      disabled.add(id)
      disposePluginWorker(id)
    }
    const next = JSON.parse(JSON.stringify(settingsStore.settings)) as Settings
    next.plugins = { disabled: [...disabled] }
    await settingsStore.saveSettings(next)
  }

  async function openPluginsFolder() {
    await api.openFolder(await api.getPluginsPath())
  }

  /** Pick a distributed .zip and install it; null if the dialog was canceled */
  async function installFromArchive(): Promise<InstalledPluginInfo | null> {
    const picked = await api.selectPluginArchive()
    if (picked.canceled || picked.filePaths.length === 0) return null
    const installed = await api.installPluginArchive(picked.filePaths[0])
    await refresh()
    return installed
  }

  return {
    plugins,
    loading,
    loaded,
    isEnabled,
    isSupported,
    enabledScrapers,
    refresh,
    ensureLoaded,
    setEnabled,
    openPluginsFolder,
    installFromArchive
  }
})
