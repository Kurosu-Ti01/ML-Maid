<template>
  <n-modal :show="show" @update:show="onUpdateShow">
    <n-card class="scraper-card" :title="$t('scraper.title')" :bordered="false" role="dialog" closable
      @close="onUpdateShow(false)">
      <!-- Search phase -->
      <template v-if="phase === 'search'">
        <n-empty v-if="scrapers.length === 0" :description="$t('scraper.noPlugins')" class="scraper-empty" />
        <template v-else>
          <div class="search-bar">
            <n-select v-model:value="sourceId" :options="sourceOptions" style="width: 170px"
              @update:value="resetResults" />
            <n-input v-model:value="query" :placeholder="$t('scraper.searchPlaceholder')" clearable
              @keyup.enter="search" />
            <n-button type="primary" :loading="searching" :disabled="!query.trim()" @click="search">
              {{ $t('scraper.search') }}
            </n-button>
          </div>

          <n-spin :show="searching || fetchingDetail" class="results-area">
            <n-empty v-if="searched && results.length === 0 && !searching" :description="$t('scraper.noResults')"
              class="scraper-empty" />
            <div v-else class="result-list">
              <div v-for="r in results" :key="r.id" class="result-item"
                :class="{ selected: r.id === selectedId }" @click="fetchDetail(r)">
                <div class="result-thumb">
                  <img v-if="thumbUrls[r.id]" :src="thumbUrls[r.id]" alt="" />
                  <n-icon v-else size="22" class="result-thumb-placeholder">
                    <component :is="ImageOutlined" />
                  </n-icon>
                </div>
                <div class="result-info">
                  <div class="result-title">{{ r.title }}</div>
                  <div v-if="r.subtitle" class="result-subtitle">{{ r.subtitle }}</div>
                  <div class="result-meta">
                    <span v-if="r.releaseDate">{{ r.releaseDate }}</span>
                    <span v-if="r.score !== undefined">★ {{ r.score }}</span>
                  </div>
                </div>
              </div>
            </div>
          </n-spin>
        </template>
      </template>

      <!-- Preview phase: pick which scraped fields to apply -->
      <template v-else>
        <div class="preview-body">
          <div class="preview-fields">
            <div class="preview-section-title">{{ $t('scraper.fieldsTitle') }}</div>
            <div v-for="row in fieldRows" :key="row.key" class="field-row">
              <n-checkbox :checked="checked[row.key]"
                @update:checked="(v: boolean) => (checked[row.key] = v)" />
              <span class="field-label">{{ row.label }}</span>
              <span class="field-preview">{{ row.preview }}</span>
            </div>
          </div>

          <div class="preview-images">
            <div v-if="meta?.coverUrl" class="image-block">
              <n-checkbox v-model:checked="checked.cover">{{ $t('gameForm.media.cover') }}</n-checkbox>
              <div class="cover-thumb-box">
                <img v-if="coverBlobUrl" :src="coverBlobUrl" alt="" class="cover-thumb" />
              </div>
            </div>

            <div v-if="screenshots.length" class="image-block">
              <n-checkbox v-model:checked="checked.background">{{ $t('gameForm.media.background') }}</n-checkbox>
              <div class="screenshot-strip">
                <div v-for="(s, i) in screenshots" :key="s.url" class="screenshot-item"
                  :class="{ selected: checked.background && selectedScreenshotUrl === s.url }"
                  @click="selectScreenshot(s.url)">
                  <img v-if="screenshotBlobUrls[i]" :src="screenshotBlobUrls[i]" alt="" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="scraper-footer">
          <n-button quaternary :disabled="applying" @click="phase = 'search'">{{ $t('scraper.back') }}</n-button>
          <n-button type="primary" :loading="applying" @click="apply">{{ $t('scraper.apply') }}</n-button>
        </div>
      </template>
    </n-card>
  </n-modal>
</template>

<script setup lang="ts" name="ScraperModal">
  import { computed, reactive, ref, watch, onBeforeUnmount } from 'vue'
  import { useMessage } from 'naive-ui'
  import { useI18n } from 'vue-i18n'
  import { ImageOutlined } from '@vicons/material'
  import { api } from '@/api'
  import type { InstalledPluginInfo } from '@/api'
  import { usePluginStore } from '@/stores/plugins'
  import {
    searchWithPlugin,
    getDetailsWithPlugin,
    disposeAllPluginWorkers,
    fetchImageAsBlobUrl
  } from '@/plugins/manager'
  import type { ScrapedMetadata, SearchResult } from '@/plugins/types'
  import type { ScrapeApplyPayload, ScrapedFields } from '@/plugins/apply'

  const props = defineProps<{
    show: boolean
    gameUuid: string
    initialQuery: string
  }>()

  const emit = defineEmits<{
    'update:show': [value: boolean]
    apply: [payload: ScrapeApplyPayload]
  }>()

  const message = useMessage()
  const { t } = useI18n()
  const pluginStore = usePluginStore()

  const phase = ref<'search' | 'preview'>('search')
  const sourceId = ref<string | null>(null)
  const query = ref('')
  const searching = ref(false)
  const searched = ref(false)
  const fetchingDetail = ref(false)
  const applying = ref(false)

  const results = ref<SearchResult[]>([])
  const selectedId = ref<string | null>(null)
  const meta = ref<ScrapedMetadata | null>(null)

  const scrapers = computed(() => pluginStore.enabledScrapers)
  const sourceOptions = computed(() =>
    scrapers.value.map(p => ({ label: p.manifest.name, value: p.manifest.id }))
  )
  const activePlugin = computed<InstalledPluginInfo | undefined>(() =>
    scrapers.value.find(p => p.manifest.id === sourceId.value)
  )
  const screenshots = computed(() => meta.value?.screenshots ?? [])

  type FieldKey = keyof ScrapedFields
  const FIELD_KEYS: FieldKey[] = [
    'title', 'releaseDate', 'communityScore', 'developer',
    'publisher', 'genre', 'tags', 'description', 'links'
  ]
  const checked = reactive<Record<FieldKey | 'cover' | 'background', boolean>>({
    title: false, releaseDate: false, communityScore: false, developer: false,
    publisher: false, genre: false, tags: false, description: false,
    links: false, cover: false, background: false
  })
  const selectedScreenshotUrl = ref('')

  // ---- blob: object URLs for remote thumbnails (proxied; see manager.ts) ----
  const thumbUrls = ref<Record<string, string>>({})
  const coverBlobUrl = ref('')
  const screenshotBlobUrls = ref<string[]>([])

  function revokeBlobUrls() {
    for (const url of Object.values(thumbUrls.value)) URL.revokeObjectURL(url)
    if (coverBlobUrl.value) URL.revokeObjectURL(coverBlobUrl.value)
    for (const url of screenshotBlobUrls.value) if (url) URL.revokeObjectURL(url)
    thumbUrls.value = {}
    coverBlobUrl.value = ''
    screenshotBlobUrls.value = []
  }

  function loadThumb(id: string, url?: string) {
    if (!url) return
    fetchImageAsBlobUrl(url)
      .then(blobUrl => { thumbUrls.value[id] = blobUrl })
      .catch(() => { /* keep the placeholder icon */ })
  }

  function resetResults() {
    results.value = []
    searched.value = false
    selectedId.value = null
  }

  watch(() => props.show, (visible) => {
    if (visible) {
      void pluginStore.ensureLoaded().then(() => {
        if (!activePlugin.value) sourceId.value = scrapers.value[0]?.manifest.id ?? null
      })
      phase.value = 'search'
      query.value = props.initialQuery
      resetResults()
    } else {
      revokeBlobUrls()
    }
  })

  // The form session is over: stop plugin workers with it
  onBeforeUnmount(() => {
    revokeBlobUrls()
    disposeAllPluginWorkers()
  })

  function onUpdateShow(value: boolean) {
    if (!applying.value) emit('update:show', value)
  }

  async function search() {
    const plugin = activePlugin.value
    if (!plugin || !query.value.trim() || searching.value) return
    searching.value = true
    resetResults()
    revokeBlobUrls()
    try {
      results.value = await searchWithPlugin(plugin, query.value.trim())
      searched.value = true
      for (const r of results.value) loadThumb(r.id, r.thumbnailUrl)
    } catch (error) {
      console.error('Scraper search failed:', error)
      message.error(t('scraper.errors.searchFailed', { error: errorText(error) }))
    } finally {
      searching.value = false
    }
  }

  async function fetchDetail(result: SearchResult) {
    const plugin = activePlugin.value
    if (!plugin || fetchingDetail.value) return
    fetchingDetail.value = true
    selectedId.value = result.id
    try {
      const detail = await getDetailsWithPlugin(plugin, result.id)
      meta.value = detail
      initChecks(detail)
      loadPreviewImages(detail)
      phase.value = 'preview'
    } catch (error) {
      console.error('Scraper detail fetch failed:', error)
      message.error(t('scraper.errors.detailFailed', { error: errorText(error) }))
    } finally {
      fetchingDetail.value = false
    }
  }

  // Everything the scrape actually returned starts checked
  function initChecks(detail: ScrapedMetadata) {
    checked.title = !!detail.title
    checked.releaseDate = !!detail.releaseDate
    checked.communityScore = detail.communityScore !== undefined
    checked.developer = !!detail.developer?.length
    checked.publisher = !!detail.publisher?.length
    checked.genre = !!detail.genre?.length
    checked.tags = !!detail.tags?.length
    checked.description = !!detail.description?.length
    checked.links = !!detail.links?.length
    checked.cover = !!detail.coverUrl
    checked.background = !!detail.screenshots?.length
    selectedScreenshotUrl.value = detail.screenshots?.[0]?.url ?? ''
  }

  function loadPreviewImages(detail: ScrapedMetadata) {
    if (coverBlobUrl.value) URL.revokeObjectURL(coverBlobUrl.value)
    coverBlobUrl.value = ''
    for (const url of screenshotBlobUrls.value) if (url) URL.revokeObjectURL(url)
    screenshotBlobUrls.value = []

    // Thumbnails where available, full image as the fallback
    if (detail.coverUrl) {
      fetchImageAsBlobUrl(detail.coverUrl)
        .then(url => { coverBlobUrl.value = url })
        .catch(() => {})
    }
    detail.screenshots?.forEach((s, i) => {
      fetchImageAsBlobUrl(s.thumbnailUrl || s.url)
        .then(url => { screenshotBlobUrls.value[i] = url })
        .catch(() => {})
    })
  }

  function selectScreenshot(url: string) {
    checked.background = true
    selectedScreenshotUrl.value = url
  }

  // 'YYYY-MM-DD' -> local-midnight ms (UTC parsing would shift a day west of GMT)
  function releaseDateToMs(date: string | null | undefined): number | null {
    if (!date) return null
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
    if (!m) return null
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime()
  }

  interface FieldRow { key: FieldKey; label: string; preview: string }

  const fieldRows = computed<FieldRow[]>(() => {
    const d = meta.value
    if (!d) return []
    const rows: (FieldRow | null)[] = FIELD_KEYS.map(key => {
      const preview = fieldPreview(d, key)
      if (preview === null) return null
      return { key, label: fieldLabel(key), preview }
    })
    return rows.filter((r): r is FieldRow => r !== null)
  })

  // null = the scrape has nothing for this field, hide the row
  function fieldPreview(d: ScrapedMetadata, key: FieldKey): string | null {
    switch (key) {
      case 'title': return d.title || null
      case 'releaseDate': return d.releaseDate || null
      case 'communityScore': return d.communityScore !== undefined ? String(d.communityScore) : null
      case 'developer': return d.developer?.length ? d.developer.join(', ') : null
      case 'publisher': return d.publisher?.length ? d.publisher.join(', ') : null
      case 'genre': return d.genre?.length ? d.genre.join(', ') : null
      case 'tags': return d.tags?.length ? d.tags.join(', ') : null
      case 'description': {
        if (!d.description?.length) return null
        const first = d.description[0]
        return first.length > 80 ? `${first.slice(0, 80)}…` : first
      }
      case 'links': return d.links?.length ? d.links.map(l => l.name).join(', ') : null
    }
  }

  function fieldLabel(key: FieldKey): string {
    if (key === 'links') return t('gameForm.tabs.links')
    if (key === 'communityScore') return t('gameForm.fields.communityScore')
    return t(`gameForm.fields.${key}`)
  }

  async function apply() {
    const d = meta.value
    if (!d || applying.value) return
    applying.value = true
    try {
      const fields: ScrapedFields = {}
      if (checked.title && d.title) fields.title = d.title
      if (checked.releaseDate) fields.releaseDate = releaseDateToMs(d.releaseDate)
      if (checked.communityScore && d.communityScore !== undefined) {
        fields.communityScore = d.communityScore
      }
      if (checked.developer && d.developer?.length) fields.developer = d.developer
      if (checked.publisher && d.publisher?.length) fields.publisher = d.publisher
      if (checked.genre && d.genre?.length) fields.genre = d.genre
      if (checked.tags && d.tags?.length) fields.tags = d.tags
      if (checked.description && d.description?.length) fields.description = d.description
      if (checked.links && d.links?.length) fields.links = d.links

      const payload: ScrapeApplyPayload = { fields }

      // Download checked artwork here so failures surface inside the modal
      if (checked.cover && d.coverUrl) {
        payload.cover = await downloadImage(d.coverUrl, 'cover')
      }
      if (checked.background && selectedScreenshotUrl.value) {
        payload.background = await downloadImage(selectedScreenshotUrl.value, 'background')
      }

      emit('apply', payload)
      emit('update:show', false)
    } catch (error) {
      console.error('Scrape apply failed:', error)
      message.error(t('scraper.errors.imageFailed', { error: errorText(error) }))
    } finally {
      applying.value = false
    }
  }

  async function downloadImage(url: string, imageType: 'cover' | 'background') {
    const result = await api.downloadGameImage({ url, gameUuid: props.gameUuid, imageType })
    if (!result.success) throw new Error(result.error || 'download failed')
    return result
  }

  function errorText(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
  }
</script>

<style scoped>
  .scraper-card {
    width: 720px;
    max-width: 92vw;
  }

  .scraper-empty {
    padding: 40px 0;
  }

  .search-bar {
    display: flex;
    gap: 8px;
  }

  .search-bar .n-input {
    flex: 1;
  }

  .results-area {
    margin-top: 12px;
    min-height: 220px;
  }

  .result-list {
    max-height: 46vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .result-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px;
    border: 1px solid var(--game-item-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background-color var(--duration-fast, 150ms) var(--ease-standard, ease),
      border-color var(--duration-fast, 150ms) var(--ease-standard, ease);
  }

  .result-item:hover {
    background: var(--primary-tint, rgba(64, 128, 255, 0.10));
  }

  .result-item.selected {
    border-color: var(--primary);
    background: var(--primary-tint, rgba(64, 128, 255, 0.10));
  }

  .result-thumb {
    width: 52px;
    height: 68px;
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
    background: var(--primary-tint, rgba(64, 128, 255, 0.10));
    color: var(--color-muted-dark);
    overflow: hidden;
  }

  .result-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .result-info {
    min-width: 0;
  }

  .result-title {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .result-subtitle {
    font-size: 12px;
    color: var(--color-muted-dark);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .result-meta {
    display: flex;
    gap: 12px;
    font-size: 12px;
    color: var(--color-muted-dark);
  }

  /* ---- Preview phase ---- */
  .preview-body {
    display: flex;
    gap: 20px;
  }

  .preview-fields {
    flex: 1;
    min-width: 0;
  }

  .preview-section-title {
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--primary);
  }

  .field-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 5px 0;
    font-size: 13px;
  }

  .field-label {
    flex: none;
    width: 110px;
    font-weight: 500;
  }

  .field-preview {
    color: var(--color-muted-dark);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .preview-images {
    width: 240px;
    flex: none;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .image-block {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .cover-thumb-box {
    height: 240px;
    border: 1px solid var(--game-item-border);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .cover-thumb {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  .screenshot-strip {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    padding-bottom: 4px;
  }

  .screenshot-item {
    width: 104px;
    height: 60px;
    flex: none;
    border: 2px solid transparent;
    border-radius: var(--radius-sm);
    background: var(--primary-tint, rgba(64, 128, 255, 0.10));
    cursor: pointer;
    overflow: hidden;
  }

  .screenshot-item.selected {
    border-color: var(--primary);
  }

  .screenshot-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .scraper-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 16px;
  }
</style>
