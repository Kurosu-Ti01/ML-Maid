import { watch } from 'vue'
import { useSettingsStore } from '@/stores/settings'

// Keep these values in sync with the glass/ambient tokens in
// src/styles/base.css (:root) and src/styles/dark-theme.css (html.dark).
export const APPEARANCE_DEFAULTS: Record<'light' | 'dark', Required<AppearanceTheme>> = {
  light: {
    glassBg: 'rgba(255, 255, 255, 0.26)',
    glassStrong: 'rgba(255, 255, 255, 0.48)',
    glassBorder: 'rgba(255, 255, 255, 0.88)',
    glassBlur: 0,
    ambientOpacity: 0.16,
    ambientBlur: 16,
    ambientSaturate: 1.05,
    ambientBrightness: 1.13
  },
  dark: {
    glassBg: 'rgba(24, 24, 27, 0.45)',
    glassStrong: 'rgba(24, 24, 27, 0.55)',
    glassBorder: 'rgba(255, 255, 255, 0.08)',
    glassBlur: 0,
    ambientOpacity: 0.16,
    ambientBlur: 16,
    ambientSaturate: 1.05,
    ambientBrightness: 1.13
  }
}

const STYLE_ID = 'ml-appearance-overrides'

// n-color-picker emits rgba()/hsla() strings in rgb mode and #RRGGBBAA in hex
// mode; settings.conf is hand-editable, so anything else falls back to default
const COLOR_RE = /^(#[0-9a-fA-F]{3,8}|rgba?\([\d.,\s%]+\)|hsla?\([\d.,\s%deg]+\))$/

function sanitizeColor(value: string | undefined, fallback: string): string {
  const v = value?.trim()
  return v && COLOR_RE.test(v) ? v : fallback
}

function clampNum(value: number | undefined, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback
}

// Defaults merged with (sanitized) overrides; also drives the settings preview
export function resolveAppearanceTheme(
  theme: 'light' | 'dark',
  overrides?: AppearanceTheme
): Required<AppearanceTheme> {
  const def = APPEARANCE_DEFAULTS[theme]
  return {
    glassBg: sanitizeColor(overrides?.glassBg, def.glassBg),
    glassStrong: sanitizeColor(overrides?.glassStrong, def.glassStrong),
    glassBorder: sanitizeColor(overrides?.glassBorder, def.glassBorder),
    glassBlur: clampNum(overrides?.glassBlur, 0, 100, def.glassBlur),
    ambientOpacity: clampNum(overrides?.ambientOpacity, 0, 1, def.ambientOpacity),
    ambientBlur: clampNum(overrides?.ambientBlur, 0, 100, def.ambientBlur),
    ambientSaturate: clampNum(overrides?.ambientSaturate, 0, 3, def.ambientSaturate),
    ambientBrightness: clampNum(overrides?.ambientBrightness, 0, 3, def.ambientBrightness)
  }
}

export function buildAmbientFilter(t: Required<AppearanceTheme>): string {
  return `blur(${t.ambientBlur}px) saturate(${t.ambientSaturate}) brightness(${t.ambientBrightness})`
}

// One CSS block per theme, containing only the user-customized variables
function themeBlock(selector: string, theme: 'light' | 'dark', overrides?: AppearanceTheme): string {
  if (!overrides) return ''
  const def = APPEARANCE_DEFAULTS[theme]
  const decls: string[] = []
  if (overrides.glassBg != null) {
    decls.push(`--glass-bg: ${sanitizeColor(overrides.glassBg, def.glassBg)};`)
  }
  if (overrides.glassStrong != null) {
    decls.push(`--glass-strong: ${sanitizeColor(overrides.glassStrong, def.glassStrong)};`)
  }
  if (overrides.glassBorder != null) {
    decls.push(`--glass-border: ${sanitizeColor(overrides.glassBorder, def.glassBorder)};`)
  }
  if (overrides.glassBlur != null) {
    decls.push(`--glass-blur: ${clampNum(overrides.glassBlur, 0, 100, def.glassBlur)}px;`)
  }
  if (overrides.ambientOpacity != null) {
    decls.push(`--ambient-opacity: ${clampNum(overrides.ambientOpacity, 0, 1, def.ambientOpacity)};`)
  }
  if (overrides.ambientBlur != null || overrides.ambientSaturate != null || overrides.ambientBrightness != null) {
    decls.push(`--ambient-filter: ${buildAmbientFilter(resolveAppearanceTheme(theme, overrides))};`)
  }
  return decls.length ? `${selector} {\n  ${decls.join('\n  ')}\n}` : ''
}

function buildCss(appearance?: Settings['appearance']): string {
  return [
    // (0,1,1) beats base.css's :root at any order and can never leak into dark
    // mode (crucial for --glass-blur, which dark-theme.css does not redeclare)
    themeBlock('html:not(.dark)', 'light', appearance?.light),
    // Ties with dark-theme.css's html.dark; wins because this tag comes later
    themeBlock('html.dark', 'dark', appearance?.dark)
  ].filter(Boolean).join('\n')
}

// Applies the user's appearance overrides app-wide by (re)building a single
// injected <style> tag whenever settings change. Call once from App.vue.
export function useAppearance() {
  const settingsStore = useSettingsStore()

  watch(
    () => settingsStore.settings.appearance,
    (appearance) => {
      let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null
      if (!el) {
        el = document.createElement('style')
        el.id = STYLE_ID
      }
      el.textContent = buildCss(appearance)
      // appendChild moves an already-attached node to the end of <head>, so
      // this tag always sits after the bundled stylesheets (dev HMR included)
      document.head.appendChild(el)
    },
    { deep: true, immediate: true }
  )
}
