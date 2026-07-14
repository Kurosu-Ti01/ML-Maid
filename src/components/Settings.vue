<template>
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
        <n-form-item :label="$t('settings.theme')">
          <n-select v-model:value="settingsStore.settings.general.theme" @update:value="saveSettings"
            :placeholder="$t('settings.selectTheme')" style="width: 200px" :options="themeOptions"
            :render-label="renderLabel" />
        </n-form-item>

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
  </div>
</template>

<script setup lang="ts" name="Settings">
  import { h, computed, ref } from 'vue'
  import { NIcon, useMessage } from 'naive-ui'
  import type { SelectOption, SelectRenderLabel } from 'naive-ui'
  import { useSettingsStore } from '../stores/settings'
  import { SettingsOutlined, DesktopWindowsOutlined, RocketLaunchOutlined } from '@vicons/material'
  import { Wrench16Regular, WeatherSunny16Regular, WeatherMoon16Regular } from '@vicons/fluent'
  import { useI18n } from 'vue-i18n'
  import { api } from '@/api'

  const settingsStore = useSettingsStore()
  const message = useMessage()
  const { t } = useI18n()
  const detecting = ref(false)

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
    // Convert reactive object to plain object for IPC
    await settingsStore.saveSettings(JSON.parse(JSON.stringify(settingsStore.settings)))
  }
</script>

<style scoped>
  .settings-view {
    padding: 15px;
    max-width: 800px;
    margin: 0 auto;
  }

  .settings-header {
    color: #0071e1;
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
    border-radius: 8px;
    background-color: var(--bg-info-content);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: #409eff;
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

  .setting-hint {
    margin: -8px 0 0;
    font-size: 12px;
    color: #909399;
    line-height: 1.5;
  }
</style>
