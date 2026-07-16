<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'

  interface Asset { name: string; browser_download_url: string; size: number; download_count: number }
  interface Release { tag_name: string; name: string; published_at: string; html_url: string; assets: Asset[] }

  const props = defineProps<{ locale?: 'en' | 'zh' }>()
  const zh = computed(() => props.locale === 'zh')
  const release = ref<Release | null>(null)
  const loading = ref(true)
  const failed = ref(false)

  const copy = computed(() => zh.value ? {
    latest: '最新稳定版本', loading: '正在读取 GitHub 最新 Release…', error: '暂时无法读取 Release 信息。', github: '前往 GitHub Releases', published: '发布于', count: '次下载', download: '下载', recommended: '推荐',
    builds: [
      ['setup', 'NSIS 安装版', '推荐大多数用户使用。按当前用户安装，并提供标准卸载程序。', '_x64-setup.exe'],
      ['msi', 'MSI 安装版', '适合偏好 Windows Installer 或需要 MSI 部署的环境。', '_x64.msi'],
      ['portable', '便携版', '解压后直接运行，配置、数据库和图片保存在程序旁。', '_x64-portable.zip'],
    ],
  } : {
    latest: 'Latest stable release', loading: 'Loading the latest GitHub release…', error: 'Release information is temporarily unavailable.', github: 'Open GitHub Releases', published: 'Published', count: 'downloads', download: 'Download', recommended: 'Recommended',
    builds: [
      ['setup', 'NSIS installer', 'Recommended for most users. Installs for the current user with a standard uninstaller.', '_x64-setup.exe'],
      ['msi', 'MSI installer', 'For environments that prefer Windows Installer or require MSI deployment.', '_x64.msi'],
      ['portable', 'Portable build', 'Extract and run directly. Settings, databases, and artwork stay beside the app.', '_x64-portable.zip'],
    ],
  })

  const builds = computed(() => copy.value.builds.map(([key, title, description, suffix]) => ({ key, title, description, asset: release.value?.assets.find(item => item.name.endsWith(suffix)) })))
  const date = computed(() => release.value ? new Intl.DateTimeFormat(zh.value ? 'zh-CN' : 'en-US', { dateStyle: 'long' }).format(new Date(release.value.published_at)) : '')
  const size = (bytes?: number) => bytes ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : '—'

  onMounted(async () => {
    try {
      const response = await fetch('https://api.github.com/repos/Kurosu-Ti01/ML-Maid/releases/latest', { headers: { Accept: 'application/vnd.github+json' } })
      if (!response.ok) throw new Error(`GitHub API ${response.status}`)
      release.value = await response.json()
    } catch (error) {
      console.error(error)
      failed.value = true
    } finally {
      loading.value = false
    }
  })
</script>

<template>
  <div class="release-box">
    <div v-if="loading" class="state"><i />{{ copy.loading }}</div>
    <div v-else-if="failed || !release" class="state error"><span>{{ copy.error }}</span><a
        href="https://github.com/Kurosu-Ti01/ML-Maid/releases/latest">{{ copy.github }} →</a></div>
    <template v-else>
      <header>
        <div><span>{{ copy.latest }}</span>
          <h2>{{ release.name || release.tag_name }}</h2>
          <p>{{ copy.published }} {{ date }}</p>
        </div>
        <a :href="release.html_url" target="_blank" rel="noopener">GitHub Release ↗</a>
      </header>
      <div class="build-grid">
        <article v-for="(build, index) in builds" :key="build.key" :class="{ featured: index === 0 }">
          <b v-if="index === 0" class="badge">{{ copy.recommended }}</b>
          <div class="icon" :class="build.key"><svg viewBox="0 0 24 24">
              <path d="M12 3v12m0 0 5-5m-5 5-5-5M5 21h14" />
            </svg></div>
          <h3>{{ build.title }}</h3>
          <p>{{ build.description }}</p>
          <div class="meta"><span>{{ size(build.asset?.size) }}</span><span v-if="build.asset">{{
            build.asset.download_count }} {{ copy.count }}</span></div>
          <a v-if="build.asset" class="download" :href="build.asset.browser_download_url">{{ copy.download }}
            <b>→</b></a>
          <a v-else class="download unavailable" :href="release.html_url">{{ copy.github }}</a>
        </article>
      </div>
    </template>
  </div>
</template>

<style scoped>
  .release-box {
    margin: 36px 0 70px
  }

  .state {
    min-height: 180px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    padding: 30px;
    border: 1px solid var(--ml-border);
    border-radius: 22px;
    color: var(--vp-c-text-2);
    background: var(--ml-card)
  }

  .state i {
    width: 22px;
    height: 22px;
    border: 2px solid var(--ml-border);
    border-top-color: var(--ml-accent);
    border-radius: 50%;
    animation: spin .8s linear infinite
  }

  .state.error {
    flex-direction: column
  }

  .state.error a {
    font-weight: 700
  }

  .release-box header {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 28px;
    padding: 26px 30px;
    border: 1px solid var(--ml-border);
    border-radius: 22px;
    background: linear-gradient(135deg, rgba(78, 130, 239, .11), rgba(144, 95, 228, .1))
  }

  .release-box header span {
    color: var(--ml-accent);
    font-size: 12px;
    font-weight: 800;
    letter-spacing: .12em;
    text-transform: uppercase
  }

  .release-box header h2 {
    margin: 7px 0 5px;
    font-size: 30px
  }

  .release-box header p {
    margin: 0;
    color: var(--vp-c-text-3)
  }

  .release-box header>a {
    flex: none;
    font-weight: 700;
    text-decoration: none
  }

  .build-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 18px
  }

  .build-grid article {
    position: relative;
    display: flex;
    flex-direction: column;
    min-height: 340px;
    padding: 28px;
    border: 1px solid var(--ml-border);
    border-radius: 22px;
    background: var(--ml-card);
    box-shadow: 0 12px 36px rgba(40, 51, 100, .06)
  }

  .build-grid article.featured {
    border-color: rgba(79, 126, 246, .42);
    box-shadow: 0 18px 42px rgba(79, 126, 246, .12)
  }

  .badge {
    position: absolute;
    right: 18px;
    top: 18px;
    padding: 5px 10px;
    border: 1px solid rgba(79, 111, 199, .22);
    border-radius: 999px;
    color: #4f6fc7;
    background: rgba(79, 111, 199, .09);
    font-size: 11px;
    font-weight: 750;
    letter-spacing: .02em
  }

  .icon {
    width: 48px;
    height: 48px;
    display: grid;
    place-items: center;
    border-radius: 15px;
    color: #4f82ee;
    background: rgba(79, 130, 238, .12)
  }

  .icon.msi {
    color: #8a60de;
    background: rgba(138, 96, 222, .12)
  }

  .icon.portable {
    color: #da609e;
    background: rgba(218, 96, 158, .12)
  }

  .icon svg {
    width: 23px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round
  }

  .build-grid h3 {
    margin: 22px 0 10px;
    font-size: 20px
  }

  .build-grid article>p {
    flex: 1;
    margin: 0;
    color: var(--vp-c-text-2);
    font-size: 14px;
    line-height: 1.7
  }

  .meta {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin: 24px 0 14px;
    color: var(--vp-c-text-3);
    font-size: 12px
  }

  .download {
    position: relative;
    min-height: 46px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 42px;
    border: 1px solid #4e6fd0;
    border-radius: 12px;
    color: #fff !important;
    background: #5577dc;
    box-shadow: 0 8px 20px rgba(62, 91, 181, .18);
    font-weight: 750;
    text-align: center;
    text-decoration: none !important;
    transition: background .2s ease, border-color .2s ease, box-shadow .2s ease, transform .2s ease
  }

  .download:hover {
    border-color: #4563bb;
    background: #4969c9;
    box-shadow: 0 10px 24px rgba(62, 91, 181, .24);
    transform: translateY(-1px)
  }

  .download b {
    position: absolute;
    right: 16px;
    font-size: 16px;
    font-weight: 600
  }

  .download.unavailable {
    border-color: var(--ml-border);
    color: var(--vp-c-text-2) !important;
    background: var(--vp-c-bg-soft);
    box-shadow: none
  }

  @keyframes spin {
    to {
      transform: rotate(360deg)
    }
  }

  @media(max-width:850px) {
    .build-grid {
      grid-template-columns: 1fr
    }

    .build-grid article {
      min-height: 300px
    }

    .release-box header {
      align-items: flex-start;
      flex-direction: column
    }
  }
</style>
