---
title: 统计、设置与故障排查
permalink: /zh/user-guide/statistics-settings/
createTime: 2026/07/15 23:19:00
---

# 统计、设置与故障排查

## 统计页面

- 总览：累计时长、游戏数量、总会话数、今天/本周/本月时长和最近会话。
- 日：选择日期，查看各会话在一天中的时间线。
- 周：按日期定位 ISO 周，比较每天各游戏的时长。
- 月：查看选定月份的每日总时长。
- 年：查看指定年份的每日分布与月度汇总。

只有完成且达到 10 秒的有效会话计入统计。

![统计界面](https://raw.githubusercontent.com/Kurosu-Ti01/ML-Maid/main/docs/ReadMe/img/Light03.png)

## 设置与数据

主题可选浅色、深色或跟随系统；语言支持英语、简体中文和日语，并同步更新托盘菜单。“最小化到托盘”决定关闭主窗口时隐藏还是退出。Locale Emulator 路径供 LE 转区模式使用。

```text
<数据目录>/
├─ config/settings.conf
├─ library/metadata.db
├─ library/statistics.db
├─ library/images/<游戏 UUID>/
└─ temp/images/<游戏 UUID>/
```

## 常见问题

- **无法启动**：确认存在文件动作、EXE 路径有效且动作名称非空。
- **未记录时长**：确认运行超过 10 秒；有启动器时使用文件夹模式，或填写真实进程名。
- **图片不显示**：重新选择并保存，不要手动移动图片库文件。
- **LE 启动失败**：重新检测或选择实际的 `LEProc.exe`。
- **关闭后仍运行**：从托盘选择“退出”，或关闭最小化到托盘。

![深色模式界面](https://raw.githubusercontent.com/Kurosu-Ti01/ML-Maid/main/docs/ReadMe/img/Dark04.png)
