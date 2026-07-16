---
title: 存储、迁移与发布
permalink: /zh/developer-guide/storage-release/
createTime: 2026/07/15 23:21:31
---

# 存储、迁移与发布

## 数据文件

`metadata.db` 的 `games` 保存游戏主体，四类查找表通过连接表实现多对多关系。图片、链接、简介、动作和进程名以路径或 JSON 字段保存。`statistics.db` 的 `game` 表每行表示一次启动会话，记录时间、时长、启动方式、退出码、日期维度和完成状态。设置写入 `config/settings.conf`。

开发构建使用仓库根目录；安装版使用 `Documents\ML-Maid`；便携版使用 EXE 所在目录。是否为安装版通过卸载程序或 Program Files 路径判断。

## 迁移

两个数据库各自维护 `db_version`。启动时迁移器兼容 Electron 旧结构、删除废弃列、增加 `localeEmulation`，并清理永未结算的孤立统计记录。破坏性迁移前调用文件复制生成版本化备份。新迁移必须可重复判断当前版本，并为旧库、干净库和全新库添加测试。

## 发布

`npm run build` 先执行前端类型检查和 Vite 构建，再运行 `tauri build`。Tauri 生成 NSIS 与 MSI；`scripts/collect-artifacts.mjs` 将安装包标准化命名，并把裸 `ml-maid.exe` 重命名后压缩为 portable ZIP，输出到 `release/<version>/`。

Rust 单元测试当前覆盖迁移、设置默认值/兼容性和进程目录匹配。修改启动或统计逻辑时应增加最小回归测试，并始终运行 Cargo test 与 fmt check。

