mod db;
mod file_manager;
mod game_launcher;
mod game_manager;
mod paths;
mod process_monitor;
mod settings;
mod stats_manager;

use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};

// Simple wiring check for the frontend adapter
#[tauri::command]
fn ping() -> String {
    "pong".into()
}

// Debug command: inspect the resolved data-dir layout
#[tauri::command]
fn get_app_paths(state: tauri::State<paths::AppPaths>) -> paths::AppPaths {
    state.inner().clone()
}

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
    }
}

/// Tray menu labels per settings language (tray.show / tray.exit in src/locales)
fn tray_labels(language: &str) -> (&'static str, &'static str) {
    match language {
        "zh-CN" => ("显示 ML-Maid", "退出"),
        "ja-JP" => ("ML-Maidを表示", "終了"),
        _ => ("Show ML-Maid", "Exit"),
    }
}

fn build_tray_menu(app: &tauri::AppHandle, language: &str) -> tauri::Result<Menu<tauri::Wry>> {
    let (show_label, exit_label) = tray_labels(language);
    let show = MenuItem::with_id(app, "show", show_label, true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", exit_label, true, None::<&str>)?;
    Menu::with_items(app, &[&show, &quit])
}

/// Rebuild the tray menu after a language change (called from settings_save)
pub fn update_tray_language(app: &tauri::AppHandle, language: &str) {
    if let Some(tray) = app.tray_by_id("main-tray") {
        if let Ok(menu) = build_tray_menu(app, language) {
            let _ = tray.set_menu(Some(menu));
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // Second launch: focus the existing window instead
            show_main_window(app);
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_paths = paths::resolve();
            println!("App data path: {}", app_paths.app_data_path.display());

            // Grant asset protocol access to the (runtime-resolved) data dir
            file_manager::allow_asset_scope(app.handle(), &app_paths);

            // Settings (config/settings.conf)
            let settings_state = settings::SettingsState::load(&app_paths.config_path)?;
            let language = settings_state.get().general.language;

            // Databases (library/metadata.db + library/statistics.db)
            let database = db::init(&app_paths.lib_path)?;

            app.manage(app_paths);
            app.manage(settings_state);
            app.manage(database);

            // Tray icon with Show / Exit menu
            let menu = build_tray_menu(app.handle(), &language)?;
            TrayIconBuilder::with_id("main-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("ML-Maid")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => show_main_window(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if matches!(event, TrayIconEvent::DoubleClick { .. }) {
                        show_main_window(tray.app_handle());
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    let minimize_to_tray = window
                        .app_handle()
                        .try_state::<settings::SettingsState>()
                        .map(|s| s.get().general.minimize_to_tray)
                        .unwrap_or(true);
                    if minimize_to_tray {
                        let _ = window.hide();
                        api.prevent_close();
                    }
                    // else: allow close; the app exits when the last window closes
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            ping,
            get_app_paths,
            settings::settings_get,
            settings::settings_save,
            game_manager::get_game_by_id,
            game_manager::get_games_list,
            game_manager::add_game,
            game_manager::update_game,
            game_manager::delete_game,
            game_manager::get_all_genres,
            game_manager::get_all_developers,
            game_manager::get_all_publishers,
            game_manager::get_all_tags,
            file_manager::process_game_image,
            file_manager::crop_game_image,
            file_manager::finalize_game_images,
            file_manager::cleanup_temp_images,
            stats_manager::get_game_recent_daily_stats,
            stats_manager::get_game_daily_stats_range,
            stats_manager::get_weekly_stats_by_date,
            stats_manager::get_daily_game_sessions,
            stats_manager::get_overall_stats,
            stats_manager::get_top_games_stats,
            stats_manager::get_monthly_stats,
            stats_manager::get_monthly_daily_stats,
            stats_manager::get_yearly_daily_stats,
            stats_manager::get_recent_sessions,
            stats_manager::get_launch_method_stats,
            game_launcher::launch_game,
            game_launcher::detect_locale_emulator
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
