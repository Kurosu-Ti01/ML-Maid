<template>
  <n-modal :show="show" @update:show="onUpdateShow">
    <n-card class="image-url-card" :title="$t('gameForm.media.urlDialogTitle')" :bordered="false" role="dialog"
      closable @close="onUpdateShow(false)">
      <n-input v-model:value="url" :placeholder="$t('gameForm.media.urlDialogPlaceholder')" clearable
        :disabled="downloading" @keyup.enter="confirm" />
      <div class="dialog-footer">
        <n-button quaternary :disabled="downloading" @click="onUpdateShow(false)">
          {{ $t('gameForm.buttons.cancel') }}
        </n-button>
        <n-button type="primary" :loading="downloading" :disabled="!isValid" @click="confirm">
          {{ $t('gameForm.media.addFromUrl') }}
        </n-button>
      </div>
    </n-card>
  </n-modal>
</template>

<script setup lang="ts" name="ImageUrlDialog">
  import { ref, computed, watch } from 'vue'
  import { useMessage } from 'naive-ui'
  import { useI18n } from 'vue-i18n'
  import { api } from '@/api'
  import type { ProcessGameImageResult } from '@/api'

  const props = defineProps<{
    show: boolean
    gameUuid: string
    imageType: 'icon' | 'background' | 'cover'
  }>()

  const emit = defineEmits<{
    'update:show': [value: boolean]
    downloaded: [result: ProcessGameImageResult]
  }>()

  const message = useMessage()
  const { t } = useI18n()

  const url = ref('')
  const downloading = ref(false)

  const isValid = computed(() => /^https?:\/\/.+/i.test(url.value.trim()))

  watch(() => props.show, (visible) => {
    if (visible) url.value = ''
  })

  function onUpdateShow(value: boolean) {
    if (!downloading.value) emit('update:show', value)
  }

  // Download happens in here so the button carries the loading state and a
  // failure leaves the dialog open for a corrected URL
  async function confirm() {
    if (!isValid.value || downloading.value) return
    downloading.value = true
    try {
      const result = await api.downloadGameImage({
        url: url.value.trim(),
        gameUuid: props.gameUuid,
        imageType: props.imageType
      })
      if (!result.success) throw new Error(result.error || 'download failed')
      emit('downloaded', result)
      emit('update:show', false)
    } catch (error) {
      console.error('Image URL download failed:', error)
      const text = error instanceof Error ? error.message : String(error)
      message.error(t('scraper.errors.imageFailed', { error: text }))
    } finally {
      downloading.value = false
    }
  }
</script>

<style scoped>
  .image-url-card {
    width: 480px;
    max-width: 90vw;
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 16px;
  }
</style>
