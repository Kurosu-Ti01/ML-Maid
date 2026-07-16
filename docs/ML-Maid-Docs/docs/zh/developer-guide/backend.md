---
title: 后端实现
permalink: /zh/developer-guide/backend/
createTime: 2026/07/15 23:21:31
---

# 后端实现

## 启动与状态

`lib.rs` 注册 single-instance、dialog 和 opener 插件，解析数据目录，加载设置与两个数据库，并将它们放入 Tauri State。第二个实例只聚焦已有窗口。关闭窗口时根据 `minimizeToTray` 隐藏或退出。

## 游戏与图片

`game_manager` 将标量字段写入 `games`，将类型、开发商、发行商、标签维护在查找表和连接表中。写操作使用事务，并发出 `game-store-changed`。删除游戏同时清理连接关系、图片目录和临时目录。

`file_manager` 支持普通图片复制，以及从 EXE/DLL/ICO/LNK 提取 Windows 图标。表单阶段写入 `temp/images/<uuid>`；保存阶段移动到 `library/images/<uuid>` 并把数据库路径改为相对数据目录的路径。运行时把 library 和 temp 加入 asset protocol scope。

## 启动与监控

`launch_game` 先验证 EXE、动作名称和转区配置，再创建未完成的统计会话并启动进程。Locale Emulator 模式委托 LEProc；基础模式设置日文环境变量。

监控线程先等待直接子进程。运行满 10 秒则直接结算；短进程被视为启动器，5 秒后按文件夹或进程名发现真实进程，每 3 秒轮询，最长 12 小时。有效结算更新统计会话、`games.timePlayed`、`lastPlayed`，并发出会话结束和停止事件。

统计查询通过 SQLite `ATTACH` 将元数据标题关联到统计库，提供单游戏日期范围、日会话、周、月、年、总览、热门游戏、最近会话和启动方式聚合。

