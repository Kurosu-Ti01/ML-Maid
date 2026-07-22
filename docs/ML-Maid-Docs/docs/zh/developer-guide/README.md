---
title: 开发者文档
permalink: /zh/developer-guide/
createTime: 2026/07/15 23:21:31
---

# 开发者文档

本文档解释 ML-Maid 0.5.0 已实现功能的设计和维护方式。

1. [开发环境与架构](./architecture.md)
2. [前端实现](./frontend.md)
3. [后端实现](./backend.md)
4. [插件系统](./plugin-system.md)
5. [插件开发指南](./plugin-development.md)
6. [存储、迁移与发布](./storage-release.md)
7. [接口参考与维护](./api-maintenance.md)

应用采用 Vue 3 WebView 前端和 Rust/Tauri 后端。前端只通过 `src/api` 的 `BackendApi` 调用后端，Rust command 负责文件系统、SQLite、进程和系统集成。

