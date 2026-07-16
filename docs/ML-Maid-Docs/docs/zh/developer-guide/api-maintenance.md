---
title: 接口参考与维护
permalink: /zh/developer-guide/api-maintenance/
createTime: 2026/07/15 23:21:31
---

# 接口参考与维护

## BackendApi 与 Commands

| 模块 | 前端方法 | Tauri command / 系统能力 |
| --- | --- | --- |
| 游戏 | `getGameById`, `getGamesList`, `addGame`, `updateGame`, `deleteGame` | `get_game_by_id`, `get_games_list`, `add_game`, `update_game`, `delete_game` |
| 元数据 | `getAllGenres/Developers/Publishers/Tags` | 对应 `get_all_*` commands |
| 启动 | `launchGame`, `detectLocaleEmulator` | `launch_game`, `detect_locale_emulator` |
| 文件选择 | `selectExecutableFile`, `selectFolder`, `selectImageFile` | dialog plugin |
| 外部打开 | `openExternalLink`, `openFolder` | opener plugin |
| 图片 | `processGameImage`, `finalizeGameImages`, `cleanupTempImages` | 对应 snake_case commands |
| 设置 | `getSettings`, `saveSettings` | `settings_get`, `settings_save` |
| 统计 | 11 个 `get*Stats`/session 方法 | `stats_manager` 中对应 commands |

统计接口包括：单游戏最近每日数据、日期范围、指定周、指定日会话、月度每日、年度每日、总览、热门游戏、年度月汇总、最近会话和启动方式统计。日期字符串使用 `YYYY-MM-DD`，时间戳使用毫秒，时长使用秒。

## 事件

| 事件 | 关键载荷 | 用途 |
| --- | --- | --- |
| `game-store-changed` | `action`, `game?` | CRUD 后刷新列表和详情 |
| `game-launched` | `gameUuid` | 标记正在运行 |
| `game-session-ended` | UUID、会话 ID、时长、总时长、起止时间 | 刷新有效会话统计 |
| `game-stopped` | `gameUuid` | 清除运行状态，包括无效短会话 |

所有订阅方法都返回取消函数，组件卸载时必须调用。

## 已知限制与维护清单

- 快捷方式、游戏信息、存档备份和脚本页尚未实现。
- 文件动作参数未进入 `LaunchParams`；详情页只使用第一个文件动作。
- 目前只有文件夹监控模式得到充分维护。
- 每次新增功能时同步更新三份 locale、`BackendApi` 类型、Rust command 注册、用户文档、中英文开发文档和相关截图。
- 发布前执行前端构建、Rust test/fmt、VuePress build，并检查中英文页面结构一致。

## 0.5.0 功能覆盖表

| 已实现能力 | 用户文档 | 实现文档 |
| --- | --- | --- |
| 安装、便携模式、旧版升级 | 开始使用 | 存储、迁移与发布 |
| 游戏 CRUD、元数据、多对多标签 | 管理游戏库 | 前端实现、后端实现 |
| 图标、封面、背景与临时图片 | 管理游戏库 | 前端实现、后端实现 |
| 链接、文件动作、搜索、筛选、排序 | 管理游戏库 | 前端实现、接口参考 |
| 普通启动、LE 转区、基础转区 | 启动与游玩记录 | 后端实现 |
| 文件/文件夹/进程监控与会话结算 | 启动与游玩记录 | 后端实现 |
| 总览与日、周、月、年统计 | 统计与设置 | 前端实现、后端实现 |
| 主题、语言、托盘和设置持久化 | 统计与设置 | 前端实现、存储与发布 |
| 数据路径、数据库迁移、打包产物 | 开始使用 | 存储、迁移与发布 |
