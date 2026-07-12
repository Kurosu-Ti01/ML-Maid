mod paths;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // Second launch: focus the existing window instead
            show_main_window(app);
        }))
        .setup(|app| {
            let app_paths = paths::resolve();
            println!("App data path: {}", app_paths.app_data_path.display());
            app.manage(app_paths);

            // Tray icon with Show / Exit menu
            // TODO(Phase 2): localize labels from settings language
            let show = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Exit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;

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
                // Minimize-to-tray behavior for the main window.
                // TODO(Phase 2): respect settings.general.minimizeToTray
                // (current default matches the Electron app: enabled)
                if window.label() == "main" {
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![ping, get_app_paths])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
