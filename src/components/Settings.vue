<template>
  <div class="settings-view">
    <el-page-header :content="'Settings'" class="settings-header">
      <template #icon>
        <el-icon>
          <Setting />
        </el-icon>
      </template>
    </el-page-header>

    <el-card class="settings-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <el-icon>
            <Tools />
          </el-icon>
          <span>General Settings</span>
        </div>
      </template>

      <el-form :model="settingsStore.settings" label-width="140px" class="settings-form">
        <el-form-item label="Theme">
          <el-select v-model="settingsStore.settings.general.theme" @change="saveSettings" placeholder="Select theme"
            style="width: 200px">
            <el-option label="Light" value="light">
              <el-icon>
                <Sunny />
              </el-icon>
              <span style="margin-left: 8px">Light</span>
            </el-option>
            <el-option label="Dark" value="dark">
              <el-icon>
                <Moon />
              </el-icon>
              <span style="margin-left: 8px">Dark</span>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="Language">
          <el-select v-model="settingsStore.settings.general.language" @change="saveSettings"
            placeholder="Select language" style="width: 200px">
            <el-option label="English" value="en-US">
              <span>🇺🇸 English</span>
            </el-option>
            <el-option label="中文" value="zh-CN">
              <span>🇨🇳 中文</span>
            </el-option>
            <el-option label="日本語" value="ja-JP">
              <span>🇯🇵 日本語</span>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="Minimize to Tray">
          <el-switch v-model="settingsStore.settings.general.minimizeToTray" @change="saveSettings"
            active-text="Enabled" inactive-text="Disabled" />
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts" name="Settings">
  import { useSettingsStore } from '../stores/settings'
  import { Setting, Tools, Sunny, Moon } from '@element-plus/icons-vue'

  const settingsStore = useSettingsStore()

  // Save settings function
  async function saveSettings() {
    // Convert reactive object to plain object for IPC
    await settingsStore.saveSettings(JSON.parse(JSON.stringify(settingsStore.settings)))
  }
</script>

<style scoped>
  .settings-view {
    padding: 20px;
    max-width: 800px;
    margin: 0 auto;
  }

  .settings-header {
    margin-bottom: 20px;
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

  :deep(.el-form-item__label) {
    font-weight: 500;
    color: #606266;
  }

  :deep(.el-select .el-input__wrapper) {
    border-radius: 6px;
  }

  :deep(.el-collapse-item__header) {
    font-weight: 500;
    color: #606266;
  }
</style>
