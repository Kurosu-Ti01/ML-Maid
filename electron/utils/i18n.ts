import enUS from '../../src/locales/en-US.json'
import zhCN from '../../src/locales/zh-CN.json'
import jaJP from '../../src/locales/ja-JP.json'

type LocaleMessages = Record<string, any>

let currentLocale = 'en-US'
const locales: Record<string, LocaleMessages> = {
  'en-US': enUS,
  'zh-CN': zhCN,
  'ja-JP': jaJP,
}

/**
 * Set the current locale for electron process translations.
 */
export function setLocale(locale: string) {
  if (locales[locale]) {
    currentLocale = locale
  }
}

/**
 * Get current locale.
 */
export function getLocale(): string {
  return currentLocale
}

/**
 * Translate a key using dot notation (e.g. 'electron.tray.show').
 * Supports named interpolation: t('key', { name: 'value' })
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const messages = locales[currentLocale] || locales['en-US'] || {}
  const parts = key.split('.')
  let value: any = messages

  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = value[part]
    } else {
      // Fallback to en-US
      value = undefined
      break
    }
  }

  // Fallback to en-US if not found in current locale
  if (value === undefined && currentLocale !== 'en-US') {
    const fallback = locales['en-US'] || {}
    let fbValue: any = fallback
    for (const part of parts) {
      if (fbValue && typeof fbValue === 'object' && part in fbValue) {
        fbValue = fbValue[part]
      } else {
        fbValue = key // Return key itself as last resort
        break
      }
    }
    value = fbValue
  }

  if (value === undefined) {
    return key
  }

  let result = String(value)

  // Apply named interpolation
  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue))
    }
  }

  return result
}
