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

  // Keep the color/font values in sync with the design tokens in src/styles/base.css.
  // Literal values (not var()) are required: Naive UI runs color composition on them.
  const themeOverrides: GlobalThemeOverrides = {
    common: {
      primaryColor: '#4080ff',
      primaryColorHover: '#6699ff',
      primaryColorPressed: '#3268d9',
      primaryColorSuppl: '#4080ff',
      borderRadius: '6px',
      borderRadiusSmall: '4px',
      fontFamily: '"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif'
    },
    Card: { borderRadius: '8px' },
    Dialog: { borderRadius: '10px' }
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
    transition: background-color var(--duration-base) var(--ease-standard), color var(--duration-base) var(--ease-standard);
  }

  #app {
    /* The custom titlebar (index.html) occupies the top 50px of the window */
    height: calc(100vh - 50px);
    width: 100vw;
    overflow: hidden;
  }

  .n-config-provider,
  .n-message-provider,
  .n-dialog-provider {
    height: 100%;
  }
</style>