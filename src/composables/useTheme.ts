import { computed, watch } from 'vue'
import { useDark, usePreferredDark } from '@vueuse/core'
import { useSettingsStore } from '@/stores/settings'

export type ThemeMode = 'light' | 'dark' | 'auto'

export const useTheme = () => {
    const settingsStore = useSettingsStore()

    // Get system preference for dark mode
    const preferredDark = usePreferredDark()

    // Current theme mode setting
    const themeMode = computed({
        get: () => settingsStore.settings.general.theme as ThemeMode,
        set: (value: ThemeMode) => {
            settingsStore.settings.general.theme = value
            settingsStore.saveSettings(settingsStore.settings)
        }
    })

    // Calculate whether dark mode should be used
    const shouldUseDark = computed(() => {
        switch (themeMode.value) {
            case 'dark':
                return true
            case 'light':
                return false
            case 'auto':
            default:
                return preferredDark.value
        }
    })

    // Use VueUse's useDark, but with manual control
    const isDark = useDark({
        selector: 'html',
        attribute: 'class',
        valueDark: 'dark',
        valueLight: 'light'
    })

    // Sync shouldUseDark to isDark
    watch(shouldUseDark, (newValue) => {
        isDark.value = newValue
    }, { immediate: true })

    return {
        isDark,
        themeMode,
        preferredDark,
        shouldUseDark
    }
}
