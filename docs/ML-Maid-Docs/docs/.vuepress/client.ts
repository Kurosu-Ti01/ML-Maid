import { defineClientConfig } from 'vuepress/client'
import HomeLanding from './theme/components/HomeLanding.vue'
import LatestReleaseDownloads from './theme/components/LatestReleaseDownloads.vue'
import './theme/styles/custom.css'

export default defineClientConfig({
  enhance({ app }) {
    app.component('HomeLanding', HomeLanding)
    app.component('LatestReleaseDownloads', LatestReleaseDownloads)
  },
})
