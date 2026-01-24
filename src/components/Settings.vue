<template>
  <div class="settings-view">
    <div class="settings-header">
      <n-icon size="24" style="margin-right: 8px;">
        <component :is="Settings16Regular" />
      </n-icon>
      <h1 class="header-title">Settings</h1>
    </div>

    <n-card class="settings-card" hoverable>
      <template #header>
        <div class="card-header">
          <n-icon size="20">
            <component :is="Wrench16Regular" />
          </n-icon>
          <span>General Settings</span>
        </div>
      </template>

      <n-form :model="settingsStore.settings" label-width="140" class="settings-form">
        <n-form-item label="Theme">
          <n-select v-model:value="settingsStore.settings.general.theme" @update:value="saveSettings"
            placeholder="Select theme" style="width: 200px" :options="themeOptions" />
        </n-form-item>

        <n-form-item label="Language">
          <n-select v-model:value="settingsStore.settings.general.language" @update:value="saveSettings"
            placeholder="Select language" style="width: 200px" :options="languageOptions" />
        </n-form-item>

        <n-form-item label="Minimize to Tray">
          <n-switch v-model:value="settingsStore.settings.general.minimizeToTray" @update:value="saveSettings">
            <template #checked>
              True
            </template>
            <template #unchecked>
              False
            </template>
          </n-switch>
        </n-form-item>
      </n-form>
    </n-card>
  </div>
</template>

<script setup lang="ts" name="Settings">
  import { h } from 'vue'
  import { NIcon } from 'naive-ui'
  import type { SelectOption } from 'naive-ui'
  import { useSettingsStore } from '../stores/settings'
  import { Settings16Regular, Wrench16Regular, WeatherSunny16Regular, WeatherMoon16Regular, Desktop16Regular } from '@vicons/fluent'

  const settingsStore = useSettingsStore()

  // Theme options with custom render
  const themeOptions: SelectOption[] = [
    {
      label: 'Light',
      value: 'light',
      renderLabel: () => h('div', { style: 'display: flex; align-items: center;' }, [
        h(NIcon, { size: 16, style: 'margin-right: 8px;' }, { default: () => h(WeatherSunny16Regular) }),
        h('span', 'Light')
      ])
    },
    {
      label: 'Dark',
      value: 'dark',
      renderLabel: () => h('div', { style: 'display: flex; align-items: center;' }, [
        h(NIcon, { size: 16, style: 'margin-right: 8px;' }, { default: () => h(WeatherMoon16Regular) }),
        h('span', 'Dark')
      ])
    },
    {
      label: 'Follow System',
      value: 'auto',
      renderLabel: () => h('div', { style: 'display: flex; align-items: center;' }, [
        h(NIcon, { size: 16, style: 'margin-right: 8px;' }, { default: () => h(Desktop16Regular) }),
        h('span', 'Follow System')
      ])
    }
  ]

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
</style>
