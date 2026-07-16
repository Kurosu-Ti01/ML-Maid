---
title: 前端实现
permalink: /zh/developer-guide/frontend/
createTime: 2026/07/15 23:21:31
---

# 前端实现

## 状态与页面

`page` Store 保存 `list | statistics | settings`。`game` Store 维护轻量游戏列表、当前 UUID、详情、加载状态和错误；收到 `game-store-changed` 或有效会话结束事件后重新加载对应数据。`modal` Store 控制添加和编辑模态框。

游戏列表只请求标题、图标和筛选排序所需字段；选中后再调用 `getGameById` 获取完整对象。API 格式化层把毫秒时间戳转换为本地显示文本，并把相对图片路径转换为 Tauri asset URL。

## 表单与图片

添加/编辑表单分为常规、高级、媒体、链接、动作和脚本页。类型、开发商、发行商和标签从查找表加载，并允许创建新值。图片选择后调用 `processGameImage`：后端复制或提取图片到临时目录，前端立即预览；保存时 CRUD command 完成归档，取消时调用 `cleanupTempImages`。

## 搜索、设置与统计

搜索在客户端按标题过滤。筛选和排序写入 `Settings`，游戏 Store 按设置计算显示列表。主题由 `useTheme` 根据 light/dark/auto 更新 DOM；语言由 Vue I18n 切换，保存设置时后端重建托盘菜单。

统计组件按标签页请求不同聚合接口，并将秒数统一格式化后交给 ECharts。日视图还读取单日会话；周、月、年视图分别使用 ISO 周、年月和年度每日数据。

翻译键必须同步维护 `en-US.json`、`zh-CN.json` 和 `ja-JP.json`。新增自动导入组件后不要手工编辑生成的 `components.d.ts` 或 `auto-imports.d.ts`。

