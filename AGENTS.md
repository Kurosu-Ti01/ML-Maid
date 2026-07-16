# Repository Guidelines

## Project Structure & Module Organization

ML-Maid is a Tauri 2 desktop application with a Vue 3/TypeScript frontend and a Rust backend. Frontend code lives in `src/`: reusable UI in `components/`, page-level views in `views/`, Pinia state in `stores/`, Tauri wrappers in `api/`, and translations in `locales/`. Global styles are under `src/styles/`; bundled images and ECharts themes are in `src/assets/` or `public/default/`. Rust commands, database migrations, process monitoring, and launch logic live in `src-tauri/src/`. Packaging helpers are in `scripts/`, while user-facing screenshots and translated README material are in `docs/ReadMe/`.

## Build, Test, and Development Commands

- `npm install` installs frontend and Tauri CLI dependencies.
- `npm run dev` launches the full desktop app with hot reload.
- `npm run dev:front` runs only the Vite frontend for UI work.
- `npm run build:front` type-checks Vue/TypeScript and creates the web bundle.
- `npm run build` builds the release application and collects artifacts into `release/`.
- `cargo test --manifest-path src-tauri/Cargo.toml` runs Rust unit tests.
- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` verifies Rust formatting.

## Coding Style & Naming Conventions

Use two-space indentation in Vue, TypeScript, JSON, and CSS. Keep TypeScript strict and resolve unused variables or parameters instead of suppressing diagnostics. Name Vue components in PascalCase (`GameAddForm.vue`), composables with a `use` prefix (`useTheme.ts`), and stores/modules in camelCase. Prefer the `@/` alias for imports from `src/`. Format Rust with `cargo fmt`; use snake_case for functions/modules and PascalCase for structs/enums. Keep translation keys synchronized across `en-US.json`, `zh-CN.json`, and `ja-JP.json`.

## Testing Guidelines

Rust unit tests currently live beside implementation code under `#[cfg(test)]`, notably in database migrations, settings, and process-monitor modules. Add focused regression tests near changed backend logic and run the full Cargo test suite. No frontend test runner is configured, so validate UI changes with `npm run build:front` and manual checks through `npm run dev`.

## Commit & Pull Request Guidelines

Follow the existing Conventional Commit pattern: `feat(tauri): ...`, `fix: ...`, or `refactor(ui): ...`. Keep commits scoped and imperative. Pull requests should explain behavior changes, identify migration or compatibility impacts, link relevant issues, and include screenshots for visible UI changes. Before submission, run frontend type-check/build, Rust tests, and formatting checks; do not commit generated `dist/`, `release/`, `library/`, `config/`, or `src-tauri/target/` content.
