<script setup lang="ts">
  import { computed } from 'vue'

  const props = defineProps<{ locale?: 'en' | 'zh' }>()
  const isZh = computed(() => props.locale === 'zh')
  const base = computed(() => isZh.value ? '/zh' : '')
  const copy = computed(() => isZh.value ? {
    eyebrow: '视觉小说游戏库与游玩时长管理器',
    tagline: '一个简洁简单简略的视觉小说管理器',
    lead: '用轻量、专注的桌面体验管理游戏资料，支持插件刮削元数据、日文转区启动、进程监控与多维度游玩统计。',
    download: '下载最新版本', guide: '查看使用文档', platform: 'Windows 10 / 11 · x64 · Tauri 2',
    section: '为视觉小说玩家而设计', sectionLead: '从整理游戏库到回顾游玩时间，常用能力都集中在一个安静、清晰的界面中。',
    cards: [
      ['完整游戏资料', '维护封面、背景、图标、评分、标签、开发商、链接与启动动作。'],
      ['插件元数据刮削', '安装插件后一键从 VNDB 等网站抓取资料与图片，也可为任意网站编写自己的刮削插件。'],
      ['可靠的启动监控', '支持普通启动、Locale Emulator 转区和三种进程监控模式。'],
      ['清晰的游玩统计', '通过日、周、月、年视图了解每部作品投入的时间。'],
    ],
  } : {
    eyebrow: 'Visual novel library and playtime manager',
    tagline: 'A clean, simple, and bare-bones visual novel manager.',
    lead: 'A focused desktop experience for game metadata, plugin-powered scraping, Japanese locale launching, process monitoring, and meaningful playtime statistics.',
    download: 'Download latest release', guide: 'Read the user guide', platform: 'Windows 10 / 11 · x64 · Tauri 2',
    section: 'Designed for visual novel libraries', sectionLead: 'From organizing titles to understanding your play history, the essentials live in one quiet, lightweight interface.',
    cards: [
      ['Rich game profiles', 'Maintain artwork, scores, tags, developers, links, installation details, and launch actions.'],
      ['Plugin metadata scraping', 'Install a plugin and pull details and artwork from sites like VNDB in one click — or write your own scraper for any website.'],
      ['Reliable launch tracking', 'Use direct launch, Locale Emulator, and three process-monitoring strategies.'],
      ['Readable playtime insights', 'Review time spent across daily, weekly, monthly, and yearly views.'],
    ],
  })
</script>

<template>
  <main class="landing">
    <section class="hero">
      <div class="hero-copy">
        <span class="eyebrow">{{ copy.eyebrow }}</span>
        <h1>
          <em>ML-Maid</em>
          <span class="hero-tagline">{{ copy.tagline }}</span>
        </h1>
        <p class="lead">{{ copy.lead }}</p>
        <div class="actions">
          <a class="button primary" :href="`${base}/download/`">
            <svg viewBox="0 0 24 24">
              <path d="M12 3v12m0 0 5-5m-5 5-5-5M5 21h14" />
            </svg>
            {{ copy.download }}
          </a>
          <a class="button secondary" :href="`${base}/user-guide/`">{{ copy.guide }} <b>→</b></a>
        </div>
        <small>{{ copy.platform }}</small>
      </div>
      <div class="visual" aria-hidden="true">
        <div class="orbit outer"><i /></div>
        <div class="orbit inner"><i /></div>
        <div class="logo-card">
          <img src="https://raw.githubusercontent.com/Kurosu-Ti01/ML-Maid/main/public/default/ML-Maid-Icon-M.png" alt=""
            no-view draggable="false">
        </div>
        <div class="float-card library"><span />Library <strong>24</strong></div>
        <div class="float-card time"><span />Playtime <strong>128h</strong></div>
      </div>
    </section>

    <section class="features">
      <div class="section-head">
        <span>ML-MAID 0.5.0</span>
        <h2>{{ copy.section }}</h2>
        <p>{{ copy.sectionLead }}</p>
      </div>
      <div class="feature-grid">
        <article v-for="(card, index) in copy.cards" :key="card[0]">
          <div class="feature-icon" :class="`tone-${index}`">{{ ['◆', '⬡', 'ϟ', '▥'][index] }}</div>
          <h3>{{ card[0] }}</h3>
          <p>{{ card[1] }}</p>
        </article>
      </div>
    </section>

  </main>
</template>

<style scoped>
  .landing {
    width: min(1180px, calc(100% - 40px));
    margin: auto;
    padding: 34px 0 80px
  }

  .hero {
    position: relative;
    min-height: 610px;
    display: grid;
    grid-template-columns: 1.12fr .88fr;
    align-items: center;
    gap: 50px;
    overflow: visible;
    padding: 70px;
    border: 1px solid var(--ml-border);
    border-radius: 32px;
    background: var(--ml-hero-bg);
    box-shadow: var(--ml-shadow)
  }

  .hero:before,
  .hero:after {
    content: "";
    position: absolute;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(106, 112, 255, .2), transparent 70%)
  }

  .hero:before {
    width: 480px;
    height: 480px;
    right: -210px;
    top: -220px
  }

  .hero:after {
    width: 400px;
    height: 400px;
    left: 25%;
    bottom: -290px;
    background: radial-gradient(circle, rgba(229, 92, 166, .14), transparent 70%)
  }

  .hero-copy,
  .visual {
    position: relative;
    z-index: 1
  }

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    color: var(--ml-accent);
    font-size: 12px;
    font-weight: 800;
    letter-spacing: .13em;
    text-transform: uppercase
  }

  .eyebrow:before {
    content: "";
    width: 24px;
    height: 1px;
    background: currentColor
  }

  .hero h1 {
    margin: 22px 0 24px;
    font-weight: 820;
    line-height: 1;
    letter-spacing: -.055em
  }

  .hero h1 em {
    display: block;
    font-size: clamp(70px, 8vw, 104px);
    font-style: normal;
    color: transparent;
    background: linear-gradient(120deg, #548dff, #8d67ee 55%, #e35f9f);
    background-clip: text;
    -webkit-background-clip: text
  }

  .hero-tagline {
    display: block;
    max-width: 720px;
    margin-top: 14px;
    color: var(--vp-c-text-1);
    font-size: clamp(30px, 3.7vw, 48px);
    line-height: 1.16;
    letter-spacing: -.04em
  }

  .lead {
    max-width: 620px;
    margin: 0;
    color: var(--vp-c-text-2);
    font-size: 18px;
    line-height: 1.8
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    margin-top: 34px
  }

  .button {
    min-height: 50px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 0 22px;
    border-radius: 14px;
    font-weight: 750;
    text-decoration: none !important;
    transition: .2s
  }

  .button:hover {
    transform: translateY(-2px)
  }

  .button svg {
    width: 19px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round
  }

  .primary {
    color: #fff !important;
    background: linear-gradient(135deg, #4f86ff, #7458e7);
    box-shadow: 0 14px 32px rgba(79, 126, 246, .28)
  }

  .secondary {
    color: var(--vp-c-text-1) !important;
    background: var(--ml-card);
    border: 1px solid var(--ml-border)
  }

  .hero small {
    display: block;
    margin-top: 22px;
    color: var(--vp-c-text-3)
  }

  .visual {
    min-height: 400px;
    display: grid;
    place-items: center
  }

  .orbit {
    position: absolute;
    width: 330px;
    height: 330px;
    border: 1px solid rgba(113, 111, 255, .24);
    border-radius: 50%;
    animation: spin 18s linear infinite
  }

  .orbit.inner {
    width: 260px;
    height: 260px;
    border-style: dashed;
    animation-direction: reverse;
    animation-duration: 13s
  }

  .orbit i {
    position: absolute;
    top: 16px;
    left: 64px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #7896ff;
    box-shadow: 0 0 20px #7896ff
  }

  .orbit.inner i {
    top: auto;
    bottom: -5px;
    left: 50%;
    background: #e75ea8;
    box-shadow: 0 0 20px #e75ea8
  }

  .logo-card {
    width: 190px;
    height: 190px;
    display: grid;
    place-items: center;
    border-radius: 44px;
    background: linear-gradient(145deg, rgba(255, 255, 255, .94), rgba(235, 239, 255, .75));
    box-shadow: 0 30px 80px rgba(63, 78, 160, .23);
    transform: rotate(-4deg)
  }

  .logo-card img {
    width: 142px;
    filter: drop-shadow(0 14px 24px rgba(67, 74, 140, .22));
    pointer-events: none;
    user-select: none
  }

  .float-card {
    position: absolute;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 13px 16px;
    border: 1px solid var(--ml-border);
    border-radius: 14px;
    background: var(--ml-glass);
    backdrop-filter: blur(14px);
    box-shadow: 0 18px 36px rgba(47, 58, 112, .12);
    color: var(--vp-c-text-2);
    font-size: 13px
  }

  .float-card span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #5d8cff
  }

  .float-card strong {
    margin-left: 8px;
    color: var(--vp-c-text-1)
  }

  .float-card.library {
    left: -10px;
    top: 72px
  }

  .float-card.time {
    right: -5px;
    bottom: 62px
  }

  .float-card.time span {
    background: #e75ea8
  }

  .features {
    padding: 108px 0 78px
  }

  .section-head {
    max-width: 680px;
    margin-bottom: 42px
  }

  .section-head>span {
    color: var(--ml-accent);
    font-size: 12px;
    font-weight: 800;
    letter-spacing: .15em
  }

  .section-head h2 {
    margin: 12px 0 14px;
    font-size: clamp(32px, 4vw, 48px);
    line-height: 1.1;
    letter-spacing: -.035em
  }

  .section-head p {
    color: var(--vp-c-text-2);
    font-size: 17px;
    line-height: 1.75
  }

  .feature-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 18px
  }

  .feature-grid article {
    padding: 30px;
    border: 1px solid var(--ml-border);
    border-radius: 22px;
    background: var(--ml-card);
    box-shadow: 0 10px 30px rgba(40, 51, 100, .06);
    transition: .25s
  }

  .feature-grid article:hover {
    transform: translateY(-5px);
    box-shadow: 0 20px 42px rgba(40, 51, 100, .11)
  }

  .feature-icon {
    width: 46px;
    height: 46px;
    display: grid;
    place-items: center;
    border-radius: 14px;
    color: #4e82ef;
    background: rgba(78, 130, 239, .12);
    font-size: 21px
  }

  .tone-1 {
    color: #9160e7;
    background: rgba(145, 96, 231, .12)
  }

  .tone-2 {
    color: #dc5f9e;
    background: rgba(220, 95, 158, .12)
  }

  .tone-3 {
    color: #35a877;
    background: rgba(53, 168, 119, .12)
  }

  .feature-grid h3 {
    margin: 22px 0 10px;
    font-size: 19px
  }

  .feature-grid p {
    margin: 0;
    color: var(--vp-c-text-2);
    font-size: 14px;
    line-height: 1.7
  }

  @keyframes spin {
    to {
      transform: rotate(360deg)
    }
  }

  @media(max-width:900px) {
    .hero {
      grid-template-columns: 1fr;
      padding: 54px 38px;
      text-align: center
    }

    .hero-copy {
      order: 2;
      display: flex;
      flex-direction: column;
      align-items: center
    }

    .visual {
      order: 1;
      min-height: 330px
    }

    .feature-grid {
      grid-template-columns: 1fr
    }

    .section-head {
      text-align: center;
      margin-inline: auto
    }
  }

  @media(max-width:560px) {
    .landing {
      width: calc(100% - 22px);
      padding-top: 14px
    }

    .hero {
      min-height: auto;
      padding: 44px 22px 34px;
      border-radius: 24px
    }

    .hero h1 em {
      font-size: 56px
    }

    .hero-tagline {
      margin-top: 12px;
      font-size: 30px
    }

    .lead {
      font-size: 16px
    }

    .actions,
    .button {
      width: 100%
    }

    .visual {
      min-height: 280px;
      transform: scale(.82);
      margin: -30px 0
    }

    .features {
      padding: 74px 0 50px
    }

    .feature-grid article {
      padding: 24px
    }

  }

  .landing {
    padding-top: 0;
  }

  .hero {
    min-height: calc(100vh - var(--vp-nav-height));
    overflow: visible;
    padding: 48px 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }

  @media (max-width: 900px) {
    .hero {
      padding: 42px 0;
    }
  }

  @media (max-width: 560px) {
    .landing {
      width: calc(100% - 32px);
      padding-top: 0;
    }

    .hero {
      min-height: auto;
      padding: 34px 0 28px;
      border-radius: 0;
    }
  }
</style>
