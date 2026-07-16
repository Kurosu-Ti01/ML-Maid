/**
 * @see https://theme-plume.vuejs.press/config/navigation/ 查看文档了解配置详情
 *
 * Navbar 配置文件，它在 `.vuepress/plume.config.ts` 中被导入。
 */

import { defineNavbarConfig } from 'vuepress-theme-plume'

export const enNavbar = defineNavbarConfig([
  { text: 'Home', link: '/' },
  { text: 'Download', link: '/download/' },
  { text: 'User Guide', link: '/user-guide/' },
  { text: 'Developer Guide', link: '/developer-guide/' },
])

export const zhNavbar = defineNavbarConfig([
  { text: '首页', link: '/zh/' },
  { text: '下载', link: '/zh/download/' },
  { text: '用户文档', link: '/zh/user-guide/' },
  { text: '开发者文档', link: '/zh/developer-guide/' },
])
