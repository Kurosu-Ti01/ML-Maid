<template>
  <n-config-provider :theme="isDark ? darkTheme : undefined" :theme-overrides="themeOverrides" :locale="naiveLocale"
    :date-locale="naiveDateLocale">
    <n-message-provider>
      <n-dialog-provider>
        <RouterView />
        <FilterDialog />
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
  import { onMounted, computed, watch } from 'vue'
  import { useGameStore } from './stores/game'
  import { useSettingsStore } from './stores/settings'
  import { useTheme } from '@/composables/useTheme'
  import FilterDialog from '@/components/FilterDialog.vue'
  import { darkTheme } from 'naive-ui'
  import type { GlobalThemeOverrides } from 'naive-ui'
  import { zhCN as naiveZhCN, dateZhCN, jaJP as naiveJaJP, dateJaJP, enUS as naiveEnUS, dateEnUS } from 'naive-ui'
  import { useI18n } from 'vue-i18n'

  const gameStore = useGameStore()
  const settingsStore = useSettingsStore()
  const { isDark } = useTheme() // Custom composable to manage theme
  const { locale } = useI18n()

  // Sync vue-i18n locale with settings store
  watch(
    () => settingsStore.settings.general.language,
    (newLang) => {
      locale.value = newLang || 'en-US'
    },
    { immediate: true }
  )

  // Naive UI locale mapping
  const naiveLocaleMap = {
    'zh-CN': naiveZhCN,
    'ja-JP': naiveJaJP,
    'en-US': naiveEnUS
  } as const

  const naiveDateLocaleMap = {
    'zh-CN': dateZhCN,
    'ja-JP': dateJaJP,
    'en-US': dateEnUS
  } as const

  type SupportedLocale = keyof typeof naiveLocaleMap

  const naiveLocale = computed(() => {
    const lang = settingsStore.settings.general.language as SupportedLocale
    return naiveLocaleMap[lang] || naiveEnUS
  })

  const naiveDateLocale = computed(() => {
    const lang = settingsStore.settings.general.language as SupportedLocale
    return naiveDateLocaleMap[lang] || dateEnUS
  })

  const themeOverrides: GlobalThemeOverrides = {
    common: {
      primaryColor: '#409eff',
      primaryColorHover: '#66b1ff',
      primaryColorPressed: '#3a8ee6',
      primaryColorSuppl: '#409eff',
      errorColor: '#ff6b6b',
      errorColorHover: '#ff8787',
      errorColorPressed: '#fa5252',
      errorColorSuppl: '#ff6b6b'
    }
  }

  onMounted(async () => {
    // Initialize games data when app starts
    await gameStore.initialize()

    // Listen for search events from titlebar
    window.addEventListener('search-games', (e: Event) => {
      const customEvent = e as CustomEvent
      gameStore.setSearchQuery(customEvent.detail || '')
    })
  })
</script>

<style>

  /* Global base styles */
  html,
  body {
    transition: background-color 0.3s ease, color 0.3s ease;
  }

  #app {
    height: 100vh;
    width: 100vw;
    overflow: hidden;
  }

  .n-config-provider,
  .n-message-provider,
  .n-dialog-provider {
    height: 100%;
  }
</style>