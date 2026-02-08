import { createI18n } from 'vue-i18n'
import enUS from './locales/en-US.json'
import zhCN from './locales/zh-CN.json'
import jaJP from './locales/ja-JP.json'

export type LocaleKey = 'en-US' | 'zh-CN' | 'ja-JP'

const i18n = createI18n({
  legacy: false,           // Use Composition API mode
  locale: 'en-US',         // Default locale (will be overridden by user settings)
  fallbackLocale: 'en-US', // Fallback locale
  messages: {
    'en-US': enUS,
    'zh-CN': zhCN,
    'ja-JP': jaJP
  }
})

export default i18n
