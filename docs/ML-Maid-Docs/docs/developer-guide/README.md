---
title: Developer Guide
permalink: /developer-guide/
createTime: 2026/07/15 23:31:25
---

# Developer Guide

This guide documents how the implemented features of ML-Maid 0.5.0 work and how to maintain them.

1. [Development and Architecture](./architecture.md)
2. [Frontend Implementation](./frontend.md)
3. [Backend Implementation](./backend.md)
4. [Storage, Migration, and Release](./storage-release.md)
5. [API Reference and Maintenance](./api-maintenance.md)

The application combines a Vue 3 webview frontend with a Rust/Tauri backend. Frontend code reaches native functionality only through the `BackendApi` adapter in `src/api`; Rust commands own SQLite, files, processes, and operating-system integration.

