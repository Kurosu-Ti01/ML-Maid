<div align="center">
  <img src=".\public\default\ML-Maid-Icon-M.png" width="128" height="128" alt="cover">

  <h1 align="center">
    ML-Maid
  </h1>

  <p align="center">
    <a href="https://www.gnu.org/licenses/gpl-3.0.en.html" target="_blank"><img alt="Static Badge" src="https://img.shields.io/badge/GPL_3.0-%23BD0000?style=for-the-badge&logo=gplv3&logoColor=FFFFFF&logoSize=auto&label=license"></a>
    <br>
    <a href="https://tauri.app/" target="_blank"><img alt="Static Badge" src="https://img.shields.io/badge/Tauri_2-24C8D8?style=for-the-badge&logo=tauri&logoColor=FFFFFF&logoSize=auto"></a>
    <a href="https://www.rust-lang.org/" target="_blank"><img alt="Static Badge" src="https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=FFFFFF&logoSize=auto"></a>
    <a href="https://vuejs.org/" target="_blank"><img alt="Static Badge" src="https://img.shields.io/badge/Vue3-4FC08D?style=for-the-badge&logo=vuedotjs&logoColor=FFFFFF&logoSize=auto"></a>
    <a href="https://www.typescriptlang.org/" target="_blank"><img alt="Static Badge" src="https://img.shields.io/badge/TypeScript-%233178C6?style=for-the-badge&logo=typescript&logoColor=FFFFFF&logoSize=auto"></a>
    <br>
    <a href="https://github.com/Kurosu-Ti01/ML-Maid/stargazers"><img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/Kurosu-Ti01/ML-Maid?style=flat-square&logo=github&labelColor=000000&color=ffdd5f"></a>
    <a href="https://github.com/Kurosu-Ti01/ML-Maid/releases"><img alt="GitHub Downloads" src="https://img.shields.io/github/downloads/Kurosu-Ti01/ML-Maid/total?style=flat-square&logo=github&labelColor=000000&color=559cf8"></a>
    <a href="https://github.com/Kurosu-Ti01/ML-Maid/graphs/contributors"><img src="https://img.shields.io/github/contributors/Kurosu-Ti01/ML-Maid?style=flat-square&logo=github&label=Contributors&labelColor=000000&color=6ec93f" /></a>
    <a href="https://github.com/Kurosu-Ti01/ML-Maid/commits"><img alt="GitHub commit activity" src="https://img.shields.io/github/commit-activity/y/Kurosu-Ti01/ML-Maid?style=flat-square&logo=github&logoColor=FFFFFF&labelColor=000000&color=ff6c49"></a>
  </p>
</div>

**English** | [简体中文](./docs/ReadMe/README_zh-CN.md)

A clean, simple, and bare-bones visual novel manager (for self use).

## ✨ Features

Some basic functionality is currently implemented:

- **Game library management**: Basic functions for adding, editing and deleting games, and provides a game information page that is tentatively intended to be concise and good-looking.
- **Game Launcher**: Launching games directly from within the app and tracks game progress. Supports Japanese locale-emulation launch via [Locale Emulator](https://github.com/xupefei/Locale-Emulator).
- **Game logging statistics**: Logging the time of each game process, providing multiple statistical views. Maybe a little redundant, but better to have it and not need it.

## ⬆️ Upgrading from 0.4.x (Electron)

Since v0.5.0 ML-Maid is built with Tauri 2 (WebView2 + Rust) instead of Electron:

- Your data is picked up automatically — the installed version keeps using `Documents\ML-Maid`, the portable version keeps using the folder next to the exe.
- On first launch the databases are migrated (a `*.backup.*` copy is created beside them). After that, they can no longer be opened by 0.4.x — restore the backup if you need to roll back.
- Please uninstall the old Electron version manually; the new installer does not replace it.
- Windows 10/11 x64 only. WebView2 Runtime is preinstalled on these systems.

## 📷 Screenshots

<details open="True">
  <summary>Light</summary>

  ![Light01](./docs/ReadMe/img/Light01.png)
  ![Light02](./docs/ReadMe/img/Light02.png)
  ![Light03](./docs/ReadMe/img/Light03.png)
  ![Light04](./docs/ReadMe/img/Light04.png)

</details>

<details>
  <summary>Dark</summary>

  ![Dark01](./docs/ReadMe/img/Dark01.png)
  ![Dark02](./docs/ReadMe/img/Dark02.png)
  ![Dark03](./docs/ReadMe/img/Dark03.png)
  ![Dark04](./docs/ReadMe/img/Dark04.png)

</details>

## 🌏 Translation

Currently, official translations are available in English and Simplified Chinese, as well as a machine-translated Japanese version. Contributions to improve translations are welcome via Pull Requests.