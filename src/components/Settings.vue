<template>
  <div class="settings-page">
    <!-- Plain element root (single node, no root-level comments): MainView's
         <Transition> needs a single element root it can animate -->
    <n-scrollbar style="height: 100%">
      <div class="settings-view">
        <div class="settings-header">
          <n-icon size="24" style="margin-right: 8px;">
            <component :is="SettingsOutlined" />
          </n-icon>
          <h1 class="header-title">{{ $t('settings.title') }}</h1>
        </div>
  
        <n-card class="settings-card" hoverable>
          <template #header>
            <div class="card-header">
              <n-icon size="20">
                <component :is="Wrench16Regular" />
              </n-icon>
              <span>{{ $t('settings.generalSettings') }}</span>
            </div>
          </template>
  
          <n-form :model="settingsStore.settings" label-width="140" class="settings-form">
            <n-form-item :label="$t('settings.language')">
              <n-select v-model:value="settingsStore.settings.general.language" @update:value="saveSettings"
                :placeholder="$t('settings.selectLanguage')" style="width: 200px" :options="languageOptions" />
            </n-form-item>
  
            <n-form-item :label="$t('settings.minimizeToTray')">
              <n-switch v-model:value="settingsStore.settings.general.minimizeToTray" @update:value="saveSettings">
                <template #checked>
                  {{ $t('settings.true') }}
                </template>
                <template #unchecked>
                  {{ $t('settings.false') }}
                </template>
              </n-switch>
            </n-form-item>
          </n-form>
        </n-card>
  
        <n-card class="settings-card" hoverable style="margin-top: 16px;">
          <template #header>
            <div class="card-header">
              <n-icon size="20">
                <component :is="ColorLensOutlined" />
              </n-icon>
              <span>{{ $t('settings.appearanceSettings') }}</span>
            </div>
          </template>
  
          <n-form :model="settingsStore.settings" label-width="140" class="settings-form">
            <n-form-item :label="$t('settings.theme')">
              <n-select v-model:value="settingsStore.settings.general.theme" @update:value="saveSettings"
                :placeholder="$t('settings.selectTheme')" style="width: 200px" :options="themeOptions"
                :render-label="renderLabel" />
            </n-form-item>
          </n-form>
  
          <!-- Which theme's glass/ambient values are being edited below -->
          <n-tabs v-model:value="activeTheme" type="segment" size="small">
            <n-tab name="light" :tab="$t('settings.themeOptions.light')" />
            <n-tab name="dark" :tab="$t('settings.themeOptions.dark')" />
          </n-tabs>
          <p class="setting-hint appearance-hint">{{ $t('settings.appearance.hint') }}</p>
  
          <!-- Local preview: renders the edited theme even while the app is in the other one -->
          <div class="appearance-preview" :class="`appearance-preview--${activeTheme}`"
            :style="{ backgroundColor: previewPageBg }">
            <div class="preview-ambient" :style="previewAmbientStyle"></div>
            <div class="preview-panel preview-panel-strong" :style="previewStrongStyle">
              <div class="preview-line" style="width: 70%"></div>
              <div class="preview-line" style="width: 50%"></div>
              <div class="preview-line" style="width: 60%"></div>
            </div>
            <div class="preview-panel preview-panel-glass" :style="previewGlassStyle">
              <div class="preview-line" style="width: 80%"></div>
              <div class="preview-line" style="width: 55%"></div>
            </div>
          </div>
  
          <div class="appearance-controls">
            <n-divider title-placement="left">{{ $t('settings.appearance.glassSection') }}</n-divider>
            <div class="ap-grid ap-grid-3">
              <div class="ap-item">
                <div class="ap-item-head">
                  <span>{{ $t('settings.appearance.glassBg') }}</span>
                </div>
                <n-color-picker v-model:value="glassBg" :show-alpha="true" :modes="['rgb', 'hex']"
                  size="small" @update:value="queueSave" />
              </div>
              <div class="ap-item">
                <div class="ap-item-head">
                  <span>{{ $t('settings.appearance.glassStrong') }}</span>
                </div>
                <n-color-picker v-model:value="glassStrong" :show-alpha="true" :modes="['rgb', 'hex']"
                  size="small" @update:value="queueSave" />
              </div>
              <div class="ap-item">
                <div class="ap-item-head">
                  <span>{{ $t('settings.appearance.glassBorder') }}</span>
                </div>
                <n-color-picker v-model:value="glassBorder" :show-alpha="true" :modes="['rgb', 'hex']"
                  size="small" @update:value="queueSave" />
              </div>
            </div>

            <div class="ap-grid" style="margin-top: 14px;">
              <div class="ap-item">
                <div class="ap-item-head">
                  <span>{{ $t('settings.appearance.glassBlur') }}</span>
                  <span class="ap-value">{{ glassBlur }}px</span>
                </div>
                <n-slider v-model:value="glassBlur" :min="0" :max="40" :step="1" :format-tooltip="formatPx"
                  @update:value="queueSave" />
              </div>
            </div>

            <n-divider title-placement="left">{{ $t('settings.appearance.ambientSection') }}</n-divider>
            <div class="ap-grid">
              <div class="ap-item">
                <div class="ap-item-head">
                  <span>{{ $t('settings.appearance.ambientOpacity') }}</span>
                  <span class="ap-value">{{ Math.round(ambientOpacity * 100) }}%</span>
                </div>
                <n-slider v-model:value="ambientOpacity" :min="0" :max="1" :step="0.01" @update:value="queueSave" />
              </div>
              <div class="ap-item">
                <div class="ap-item-head">
                  <span>{{ $t('settings.appearance.ambientBlur') }}</span>
                  <span class="ap-value">{{ ambientBlur }}px</span>
                </div>
                <n-slider v-model:value="ambientBlur" :min="0" :max="64" :step="1" :format-tooltip="formatPx"
                  @update:value="queueSave" />
              </div>
              <div class="ap-item">
                <div class="ap-item-head">
                  <span>{{ $t('settings.appearance.ambientSaturate') }}</span>
                  <span class="ap-value">{{ ambientSaturate.toFixed(2) }}</span>
                </div>
                <n-slider v-model:value="ambientSaturate" :min="0" :max="3" :step="0.05" @update:value="queueSave" />
              </div>
              <div class="ap-item">
                <div class="ap-item-head">
                  <span>{{ $t('settings.appearance.ambientBrightness') }}</span>
                  <span class="ap-value">{{ ambientBrightness.toFixed(2) }}</span>
                </div>
                <n-slider v-model:value="ambientBrightness" :min="0" :max="3" :step="0.05" @update:value="queueSave" />
              </div>
            </div>

            <div class="appearance-reset-row">
              <n-button size="small" @click="resetAppearanceTheme">
                {{ $t('settings.appearance.reset') }}
              </n-button>
            </div>
          </div>
        </n-card>
  
        <n-card class="settings-card" hoverable style="margin-top: 16px;">
          <template #header>
            <div class="card-header">
              <n-icon size="20">
                <component :is="RocketLaunchOutlined" />
              </n-icon>
              <span>{{ $t('settings.launcherSettings') }}</span>
            </div>
          </template>
  
          <n-form :model="settingsStore.settings" label-width="140" class="settings-form">
            <n-form-item :label="$t('settings.localeEmulatorPath')">
              <div class="le-path-row">
                <n-input v-model:value="localeEmulatorPath" @blur="saveSettings"
                  :placeholder="$t('settings.localeEmulatorPathPlaceholder')" clearable />
                <n-button @click="browseLocaleEmulator">{{ $t('settings.browse') }}</n-button>
                <n-button @click="detectLocaleEmulator" :loading="detecting">{{ $t('settings.detect') }}</n-button>
              </div>
            </n-form-item>
            <p class="setting-hint">{{ $t('settings.localeEmulatorHint') }}</p>
          </n-form>
        </n-card>

        <n-card class="settings-card" hoverable style="margin-top: 16px;">
          <template #header>
            <div class="card-header">
              <n-icon size="20">
                <component :is="ExtensionOutlined" />
              </n-icon>
              <span>{{ $t('settings.plugins.title') }}</span>
            </div>
          </template>
          <template #header-extra>
            <div class="plugin-actions">
              <n-button size="small" @click="openPluginsFolder">
                {{ $t('settings.plugins.openFolder') }}
              </n-button>
              <n-button size="small" :loading="pluginStore.loading" @click="refreshPlugins">
                {{ $t('settings.plugins.refresh') }}
              </n-button>
            </div>
          </template>

          <n-empty v-if="pluginStore.plugins.length === 0" :description="$t('settings.plugins.empty')"
            style="padding: 24px 0" />
          <div v-else class="plugin-list">
            <div v-for="plugin in pluginStore.plugins" :key="plugin.manifest.id" class="plugin-row">
              <div class="plugin-info">
                <div class="plugin-name-row">
                  <span class="plugin-name">{{ plugin.manifest.name }}</span>
                  <n-tag size="small" :bordered="false">v{{ plugin.manifest.version }}</n-tag>
                  <n-tag v-if="pluginStore.isSupported(plugin.manifest)" size="small" type="info" :bordered="false">
                    {{ $t('settings.plugins.type.metadataScraper') }}
                  </n-tag>
                  <n-tag v-else size="small" type="warning" :bordered="false">
                    {{ $t('settings.plugins.unsupported') }}
                  </n-tag>
                </div>
                <p v-if="plugin.manifest.description" class="plugin-desc">{{ plugin.manifest.description }}</p>
              </div>
              <n-switch :value="pluginStore.isEnabled(plugin.manifest.id)"
                :disabled="!pluginStore.isSupported(plugin.manifest)"
                @update:value="(v: boolean) => pluginStore.setEnabled(plugin.manifest.id, v)" />
            </div>
          </div>
          <p class="setting-hint plugin-hint">{{ $t('settings.plugins.installHint') }}</p>
        </n-card>
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts" name="Settings">
  import { h, computed, ref, onBeforeUnmount, onMounted } from 'vue'
  import { NIcon, useMessage } from 'naive-ui'
  import type { SelectOption, SelectRenderLabel } from 'naive-ui'
  import { useDebounceFn } from '@vueuse/core'
  import { useSettingsStore } from '../stores/settings'
  import { usePluginStore } from '../stores/plugins'
  import { useTheme } from '@/composables/useTheme'
  import { APPEARANCE_DEFAULTS, resolveAppearanceTheme, buildAmbientFilter } from '@/composables/useAppearance'
  import { SettingsOutlined, DesktopWindowsOutlined, RocketLaunchOutlined, ColorLensOutlined, ExtensionOutlined } from '@vicons/material'
  import { Wrench16Regular, WeatherSunny16Regular, WeatherMoon16Regular } from '@vicons/fluent'
  import { useI18n } from 'vue-i18n'
  import { api } from '@/api'
  import defaultBackground from '/default/ML-Maid-Background.png'

  const settingsStore = useSettingsStore()
  const pluginStore = usePluginStore()
  const message = useMessage()
  const { t } = useI18n()
  const detecting = ref(false)

  onMounted(() => { void pluginStore.ensureLoaded() })

  async function refreshPlugins() {
    await pluginStore.refresh()
    message.success(t('settings.plugins.refreshed'))
  }

  function openPluginsFolder() {
    void pluginStore.openPluginsFolder()
  }

  // Two-way proxy so the optional launcher section always exists when edited
  const localeEmulatorPath = computed({
    get: () => settingsStore.settings.launcher?.localeEmulatorPath || '',
    set: (value: string) => {
      if (!settingsStore.settings.launcher) {
        settingsStore.settings.launcher = {}
      }
      settingsStore.settings.launcher.localeEmulatorPath = value
    }
  })

  // ==========================================
  //  Appearance (glass / ambient customization)
  // ==========================================

  const { isDark } = useTheme()

  // Which theme's values the tabs are editing; open on the live one
  const activeTheme = ref<'light' | 'dark'>(isDark.value ? 'dark' : 'light')

  // Two-way proxy for one appearance field of the actively edited theme.
  // Read: stored value or the CSS default. Write: lazy-init the optional
  // sections (same pattern as localeEmulatorPath), rounding slider floats
  // so the config file doesn't accumulate 0.15000000000000002 noise.
  function apField<K extends keyof AppearanceTheme>(key: K) {
    type V = Required<AppearanceTheme>[K]
    return computed({
      get: (): V => (settingsStore.settings.appearance?.[activeTheme.value]?.[key]
        ?? APPEARANCE_DEFAULTS[activeTheme.value][key]) as V,
      set: (value: V | null | undefined) => {
        if (value === null || value === undefined) return // n-color-picker can emit null
        const s = settingsStore.settings
        if (!s.appearance) s.appearance = {}
        if (!s.appearance[activeTheme.value]) s.appearance[activeTheme.value] = {}
        s.appearance[activeTheme.value]![key] =
          (typeof value === 'number' ? Math.round(value * 100) / 100 : value) as AppearanceTheme[K]
      }
    })
  }

  const glassBg = apField('glassBg')
  const glassStrong = apField('glassStrong')
  const glassBorder = apField('glassBorder')
  const glassBlur = apField('glassBlur')
  const ambientOpacity = apField('ambientOpacity')
  const ambientBlur = apField('ambientBlur')
  const ambientSaturate = apField('ambientSaturate')
  const ambientBrightness = apField('ambientBrightness')

  const formatPx = (value: number) => `${value}px`

  // Store writes above re-inject the live CSS instantly (useAppearance watcher);
  // only the disk write is debounced while sliders/pickers are being dragged.
  let appearanceDirty = false
  const debouncedSave = useDebounceFn(() => { void saveSettings() }, 500)

  function queueSave() {
    appearanceDirty = true
    debouncedSave()
  }

  // Flush a pending debounced edit when leaving the settings page
  onBeforeUnmount(() => {
    if (appearanceDirty) void saveSettings()
  })

  // Clears only the actively edited theme; the other theme keeps its values
  function resetAppearanceTheme() {
    const appearance = settingsStore.settings.appearance
    if (appearance) delete appearance[activeTheme.value]
    void saveSettings()
    message.success(t('settings.appearance.resetDone'))
  }

  // ---- Preview (inline styles, independent of the app's live theme) ----

  const previewResolved = computed(() =>
    resolveAppearanceTheme(activeTheme.value, settingsStore.settings.appearance?.[activeTheme.value]))

  // --bg-page values; keep in sync with base.css / dark-theme.css
  const previewPageBg = computed(() => activeTheme.value === 'dark' ? '#1e1e1e' : '#ffffff')

  // Mirrors .list-ambient in MainView.vue so the preview is faithful
  const previewAmbientStyle = computed(() => ({
    backgroundImage: `url('${defaultBackground}')`,
    filter: buildAmbientFilter(previewResolved.value),
    opacity: String(previewResolved.value.ambientOpacity)
  }))

  const previewGlassStyle = computed(() => ({
    background: previewResolved.value.glassBg,
    border: `1px solid ${previewResolved.value.glassBorder}`,
    backdropFilter: `blur(${previewResolved.value.glassBlur}px)`
  }))

  const previewStrongStyle = computed(() => ({
    background: previewResolved.value.glassStrong,
    border: `1px solid ${previewResolved.value.glassBorder}`,
    backdropFilter: `blur(${previewResolved.value.glassBlur}px)`
  }))

  // Browse for LEProc.exe manually
  async function browseLocaleEmulator() {
    try {
      const result = await api.selectExecutableFile()
      if (!result.canceled && result.filePaths.length > 0) {
        localeEmulatorPath.value = result.filePaths[0]
        await saveSettings()
      }
    } catch (error) {
      console.error('Failed to browse for LEProc.exe:', error)
    }
  }

  // Ask the backend to look in common install locations
  async function detectLocaleEmulator() {
    detecting.value = true
    try {
      const path = await api.detectLocaleEmulator()
      if (path) {
        localeEmulatorPath.value = path
        await saveSettings()
        message.success(t('settings.localeEmulatorFound', { path }))
      } else {
        message.warning(t('settings.localeEmulatorNotFound'))
      }
    } catch (error) {
      console.error('Failed to detect Locale Emulator:', error)
      message.error(t('settings.localeEmulatorNotFound'))
    } finally {
      detecting.value = false
    }
  }

  // Render label with icon
  const renderLabel: SelectRenderLabel = (option) => {
    const iconMap: Record<string, any> = {
      'light': WeatherSunny16Regular,
      'dark': WeatherMoon16Regular,
      'auto': DesktopWindowsOutlined
    }

    return h(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center'
        }
      },
      [
        h(NIcon, {
          size: 16,
          style: {
            marginRight: '8px'
          }
        }, {
          default: () => h(iconMap[option.value as string])
        }),
        h('span', null, option.label as string)
      ]
    )
  }

  // Theme options with custom render
  const themeOptions = computed(() => [
    {
      label: t('settings.themeOptions.light'),
      value: 'light'
    },
    {
      label: t('settings.themeOptions.dark'),
      value: 'dark'
    },
    {
      label: t('settings.themeOptions.followSystem'),
      value: 'auto'
    }
  ])

  // Language options
  const languageOptions: SelectOption[] = [
    { label: '🇺🇸 English', value: 'en-US' },
    { label: '🇨🇳 中文', value: 'zh-CN' },
    { label: '🇯🇵 日本語', value: 'ja-JP' }
  ]

  // Save settings function
  async function saveSettings() {
    appearanceDirty = false
    // Convert reactive object to plain object for IPC
    await settingsStore.saveSettings(JSON.parse(JSON.stringify(settingsStore.settings)))
  }
</script>

<style scoped>
  .settings-page {
    height: 100%;
  }

  .settings-view {
    padding: 15px;
    max-width: 800px;
    margin: 0 auto;
  }

  .settings-header {
    color: var(--primary);
    margin-bottom: 20px;
    display: flex;
    align-items: center;
  }

  .header-title {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
  }

  .settings-card {
    background-color: var(--bg-info-content);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: var(--primary);
  }

  .settings-form {
    padding: 10px 0;
  }

  .le-path-row {
    display: flex;
    gap: 8px;
    width: 100%;
  }

  .le-path-row .n-input {
    flex: 1;
  }

  .plugin-actions {
    display: flex;
    gap: 8px;
  }

  .plugin-list {
    display: flex;
    flex-direction: column;
  }

  .plugin-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 10px 0;
    border-bottom: 1px solid var(--game-item-border);
  }

  .plugin-row:last-child {
    border-bottom: none;
  }

  .plugin-info {
    min-width: 0;
  }

  .plugin-name-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .plugin-name {
    font-weight: 600;
  }

  .plugin-desc {
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--color-muted-dark);
  }

  .plugin-hint {
    margin-top: 10px;
  }

  .setting-hint {
    margin: -8px 0 0;
    font-size: 12px;
    color: var(--color-muted-dark);
    line-height: 1.5;
  }

  .appearance-hint {
    margin: 8px 0 12px;
  }

  /* ---- Appearance preview (inline vars supply the edited theme's values) ---- */
  .appearance-preview {
    position: relative;
    height: 140px;
    border-radius: var(--radius-md);
    border: 1px solid var(--game-item-border);
    overflow: hidden;
  }

  /* Mirrors .list-ambient in MainView.vue */
  .preview-ambient {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center 25%;
    transform: scale(1.2);
    pointer-events: none;
  }

  .preview-panel {
    position: absolute;
    border-radius: var(--radius-md);
    padding: 10px;
  }

  .preview-panel-strong {
    left: 12px;
    top: 12px;
    bottom: 12px;
    width: 32%;
  }

  .preview-panel-glass {
    right: 12px;
    top: 32px;
    width: 46%;
  }

  .preview-line {
    height: 8px;
    border-radius: 4px;
    margin-bottom: 8px;
  }

  .preview-line:last-child {
    margin-bottom: 0;
  }

  .appearance-preview--light .preview-line {
    background: rgba(0, 0, 0, 0.30);
  }

  .appearance-preview--dark .preview-line {
    background: rgba(255, 255, 255, 0.45);
  }

  .appearance-reset-row {
    display: flex;
    justify-content: flex-end;
    margin-top: 14px;
  }

  /* ---- Compact multi-column layout for the appearance controls ---- */
  .ap-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px 28px;
  }

  .ap-grid-3 {
    grid-template-columns: repeat(3, 1fr);
    column-gap: 16px;
  }

  .ap-item {
    min-width: 0;
  }

  .ap-item-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 6px;
    font-size: 12px;
    color: var(--color-muted);
  }

  .ap-value {
    font-variant-numeric: tabular-nums;
    color: var(--color-muted-dark);
  }

  .appearance-controls :deep(.n-divider:not(.n-divider--vertical)) {
    margin: 16px 0 12px;
  }

  .appearance-controls :deep(.n-divider .n-divider__title) {
    font-size: 13px;
    font-weight: 600;
  }
</style>
