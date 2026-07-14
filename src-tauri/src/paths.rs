use std::path::{Path, PathBuf};

use serde::Serialize;

/// Application data paths, resolved once at startup and stored in Tauri State.
///
/// Data-dir contract (must stay compatible with the Electron version):
/// 1. Dev build          -> project root (repo checkout)
/// 2. Installed          -> Documents\ML-Maid   (detected by an uninstaller
///    next to the exe: Tauri NSIS `uninstall.exe`, or the legacy Electron
///    `Uninstall ML-Maid.exe`)
/// 3. Portable (default) -> directory containing the exe
#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AppPaths {
    pub is_dev: bool,
    pub app_data_path: PathBuf,
    pub lib_path: PathBuf,
    pub temp_path: PathBuf,
    pub img_path_game: PathBuf,
    pub config_path: PathBuf,
}

/// Installed vs portable detection. Installed means data goes to
/// Documents\ML-Maid; anything else is portable (data beside the exe).
///
/// - NSIS installs put `uninstall.exe` next to the app
///   (the legacy Electron installer used `Uninstall ML-Maid.exe`)
/// - MSI (WiX) installs create no uninstaller exe, so also treat any
///   location under Program Files / Program Files (x86) as installed —
///   those directories are not writable without elevation anyway
fn is_installed(exe_dir: &Path) -> bool {
    if exe_dir.join("uninstall.exe").exists()
        || exe_dir.join("Uninstall ML-Maid.exe").exists()
    {
        return true;
    }

    for env_var in ["ProgramFiles", "ProgramFiles(x86)"] {
        if let Ok(program_files) = std::env::var(env_var) {
            if exe_dir.starts_with(&program_files) {
                return true;
            }
        }
    }
    false
}

pub fn resolve() -> AppPaths {
    let is_dev = cfg!(debug_assertions);

    let app_data_path = if is_dev {
        // Project root = parent of src-tauri/
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .expect("src-tauri must live inside the project root")
            .to_path_buf()
    } else {
        let exe_dir = std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.to_path_buf()))
            .expect("cannot resolve executable directory");

        if is_installed(&exe_dir) {
            dirs::document_dir()
                .expect("cannot resolve Documents directory")
                .join("ML-Maid")
        } else {
            exe_dir
        }
    };

    AppPaths {
        is_dev,
        lib_path: app_data_path.join("library"),
        temp_path: app_data_path.join("temp"),
        img_path_game: app_data_path.join("library").join("images"),
        config_path: app_data_path.join("config"),
        app_data_path,
    }
}
