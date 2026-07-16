---
title: 开始使用
permalink: /zh/user-guide/getting-started/
createTime: 2026/07/15 23:19:00
---

# 开始使用

## 系统与安装

ML-Maid 0.5.0 支持 Windows 10/11 x64，界面依赖系统 WebView2 Runtime。发布包包含 NSIS 安装程序、MSI 安装包和 portable ZIP。安装版把数据保存在 `Documents\ML-Maid`；便携版把数据放在程序旁，因此不要放进需要管理员权限写入的目录。

## 从 0.4.x 升级

0.5.0 已从 Electron 迁移至 Tauri。首次运行会识别旧数据库并执行迁移；涉及结构删除时，会在数据库旁创建 `*.backup.v<版本>.<时间戳>`。迁移后的数据库不能直接交给旧版使用，如需回退请先退出程序并恢复备份。旧 Electron 安装需要手动卸载。

## 主界面

左侧窄栏包含三个入口：游戏库、统计和设置。游戏库左侧列表与右侧详情之间的分隔线可以拖动。关闭窗口时，如果启用了“最小化到托盘”，程序会隐藏而不是退出；双击托盘图标或选择“显示 ML-Maid”可恢复窗口。

![ML-Maid 浅色主界面](https://raw.githubusercontent.com/Kurosu-Ti01/ML-Maid/main/docs/ReadMe/img/Light01.png)
