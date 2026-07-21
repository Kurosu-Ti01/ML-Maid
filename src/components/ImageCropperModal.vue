<template>
  <n-modal :show="show" :mask-closable="false" @update:show="onUpdateShow">
    <n-card class="image-cropper-card" :title="$t('gameForm.crop.title')" :bordered="false" role="dialog">
      <div class="cropper-area">
        <Cropper ref="cropperRef" class="cropper" :src="imageUrl"
          :stencil-props="{ aspectRatio: currentRatio ?? undefined }" :default-size="maximizeSize" :canvas="false"
          :check-orientation="false" />
      </div>

      <div class="cropper-toolbar">
        <span class="toolbar-label">{{ $t('gameForm.crop.aspectRatio') }}</span>
        <n-radio-group v-model:value="selectedPreset" size="small" @update:value="applyPreset">
          <n-radio-button v-for="preset in presets" :key="preset.key" :value="preset.key" :label="preset.label" />
        </n-radio-group>
      </div>

      <div class="cropper-footer">
        <n-button quaternary @click="close">{{ $t('gameForm.buttons.cancel') }}</n-button>
        <n-button type="primary" :loading="cropping" @click="applyCrop">{{ $t('gameForm.crop.apply') }}</n-button>
      </div>
    </n-card>
  </n-modal>
</template>

<script setup lang="ts" name="ImageCropperModal">
  import { ref, computed, watch, nextTick } from 'vue'
  import { useMessage } from 'naive-ui'
  import { useI18n } from 'vue-i18n'
  import { Cropper } from 'vue-advanced-cropper'
  import type { TransformParams } from 'vue-advanced-cropper'
  import 'vue-advanced-cropper/dist/style.css'
  import { api } from '@/api'
  import type { ProcessGameImageResult } from '@/api'

  interface AspectPreset {
    key: string
    label: string
    ratio: number | null // null = free-form
  }

  const props = defineProps<{
    show: boolean
    imageUrl: string   // asset URL shown in the cropper
    sourcePath: string // fs path (temp or library-relative) sent to the backend
    imageType: 'background' | 'cover'
    gameUuid: string
  }>()

  const emit = defineEmits<{
    'update:show': [value: boolean]
    cropped: [result: ProcessGameImageResult]
  }>()

  const message = useMessage()
  const { t } = useI18n()

  const cropperRef = ref<InstanceType<typeof Cropper> | null>(null)
  const presets = ref<AspectPreset[]>([])
  const selectedPreset = ref('')
  const cropping = ref(false)

  const currentRatio = computed(
    () => presets.value.find(p => p.key === selectedPreset.value)?.ratio ?? null
  )

  // The detail-view hero is (pane width) x 56vh with object-fit: cover, so its
  // ratio depends on the live window. Measure the real element when it is in
  // the DOM (it usually sits behind the form modal); otherwise estimate from
  // the window: 50px nav rail, default 0.75 detail pane, hero min-height 320px.
  function computeHeroRatio(): number {
    const hero = document.querySelector('.background-title-container')
    if (hero) {
      const rect = hero.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        return clampRatio(rect.width / rect.height)
      }
    }
    const width = (window.innerWidth - 50) * 0.75
    const height = Math.max(window.innerHeight * 0.56, 320)
    return clampRatio(width / height)
  }

  function clampRatio(ratio: number): number {
    return Math.min(8, Math.max(0.2, ratio))
  }

  function buildPresets(): AspectPreset[] {
    if (props.imageType === 'background') {
      const heroRatio = computeHeroRatio()
      return [
        { key: 'display', label: `${t('gameForm.crop.displayRatio')} (${heroRatio.toFixed(2)}:1)`, ratio: heroRatio },
        { key: '21:9', label: '21:9', ratio: 21 / 9 },
        { key: '2:1', label: '2:1', ratio: 2 },
        { key: '16:9', label: '16:9', ratio: 16 / 9 },
        { key: 'free', label: t('gameForm.crop.free'), ratio: null }
      ]
    }
    // Cover: the form preview area (240x320) and typical box art are 3:4
    return [
      { key: '3:4', label: '3:4', ratio: 3 / 4 },
      { key: '2:3', label: '2:3', ratio: 2 / 3 },
      { key: 'free', label: t('gameForm.crop.free'), ratio: null }
    ]
  }

  // Presets are rebuilt on every open so the display ratio tracks the window
  watch(() => props.show, (visible) => {
    if (visible) {
      presets.value = buildPresets()
      selectedPreset.value = presets.value[0].key
    }
  })

  // With a locked stencil aspect the cropper clamps this to the largest
  // allowed rect, i.e. a maximized centered default selection
  function maximizeSize({ imageSize }: Pick<TransformParams, 'imageSize'>) {
    return { width: imageSize.width, height: imageSize.height }
  }

  async function applyPreset() {
    // Let the new stencil aspect propagate before setting coordinates
    await nextTick()
    const ratio = currentRatio.value
    cropperRef.value?.setCoordinates([
      ({ imageSize }: TransformParams) => {
        let width = imageSize.width
        let height = imageSize.height
        if (ratio) {
          if (width / height > ratio) width = height * ratio
          else height = width / ratio
        }
        return { width, height }
      },
      ({ coordinates, imageSize }: TransformParams) => ({
        left: (imageSize.width - coordinates.width) / 2,
        top: (imageSize.height - coordinates.height) / 2
      })
    ])
  }

  async function applyCrop() {
    const cropper = cropperRef.value
    if (!cropper) return
    const { coordinates, image } = cropper.getResult()
    if (!coordinates || !image?.width || !image?.height) {
      close()
      return
    }

    // Integer rect clamped to the image (the backend expects u32 pixels)
    const x = Math.max(0, Math.round(coordinates.left))
    const y = Math.max(0, Math.round(coordinates.top))
    const width = Math.min(Math.round(coordinates.width), image.width - x)
    const height = Math.min(Math.round(coordinates.height), image.height - y)

    // Selecting the whole image is a no-op: skip the backend round-trip
    if (x === 0 && y === 0 && width >= image.width && height >= image.height) {
      close()
      return
    }

    cropping.value = true
    try {
      const result = await api.cropGameImage({
        sourcePath: props.sourcePath,
        gameUuid: props.gameUuid,
        imageType: props.imageType,
        x, y, width, height
      })
      if (result.success) {
        emit('cropped', result)
        close()
      } else {
        message.error(result.error || t('gameForm.messages.cropFailed'))
      }
    } catch (error) {
      console.error('Error cropping image:', error)
      message.error(t('gameForm.messages.cropFailed'))
    } finally {
      cropping.value = false
    }
  }

  function close() {
    emit('update:show', false)
  }

  function onUpdateShow(value: boolean) {
    emit('update:show', value)
  }
</script>

<style scoped>
  .image-cropper-card {
    width: min(860px, 92vw);
  }

  /* Compound selector outweighs Naive's runtime-injected .n-card rule */
  .image-cropper-card.n-card {
    border-radius: var(--radius-lg);
  }

  .cropper-area {
    height: min(56vh, 480px);
    background-color: var(--image-area-bg);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .cropper {
    width: 100%;
    height: 100%;
  }

  .cropper-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 16px;
    flex-wrap: wrap;
  }

  .toolbar-label {
    font-size: 14px;
    color: var(--color-muted-dark);
    flex-shrink: 0;
  }

  .cropper-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 16px;
  }

  .cropper-footer .n-button {
    min-width: 88px;
  }
</style>
