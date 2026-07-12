use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;
use tauri::Manager;

use crate::game_manager::Game;
use crate::paths::AppPaths;

type CmdResult<T> = Result<T, String>;

fn e<E: std::fmt::Display>(ctx: &str) -> impl FnOnce(E) -> String + '_ {
    move |err| format!("{ctx}: {err}")
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ProcessImageResult {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temp_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub preview_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MovedFile {
    pub file_name: String,
    pub new_path: String,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessImageParams {
    pub source_path: String,
    pub game_uuid: String,
    pub image_type: String,
}

const EXECUTABLE_EXTS: &[&str] = &["exe", "dll", "lnk", "ico"];

/// Process a picked image for the add/edit form.
/// Returns a file path (not base64) so the renderer can display it via
/// convertFileSrc/asset protocol; for the special "preview" type it just
/// resolves the existing library path.
#[tauri::command]
pub fn process_game_image(
    paths: tauri::State<AppPaths>,
    params: ProcessImageParams,
) -> ProcessImageResult {
    match process_image_inner(&paths, &params) {
        Ok(res) => res,
        Err(err) => ProcessImageResult {
            success: false,
            temp_path: None,
            preview_url: None,
            error: Some(err),
        },
    }
}

fn process_image_inner(
    paths: &AppPaths,
    params: &ProcessImageParams,
) -> CmdResult<ProcessImageResult> {
    // Preview mode: resolve an existing (possibly relative) path, no copy
    if params.image_type == "preview" {
        let src = Path::new(&params.source_path);
        let full = if src.is_absolute() {
            src.to_path_buf()
        } else {
            paths
                .app_data_path
                .join(params.source_path.replace('/', std::path::MAIN_SEPARATOR_STR))
        };
        if full.exists() {
            return Ok(ProcessImageResult {
                success: true,
                temp_path: Some(full.to_string_lossy().to_string()),
                preview_url: Some(full.to_string_lossy().to_string()),
                error: None,
            });
        }
        return Ok(ProcessImageResult {
            success: false,
            temp_path: None,
            preview_url: None,
            error: Some("Image file not found".into()),
        });
    }

    let temp_dir = paths.temp_path.join("images").join(&params.game_uuid);
    fs::create_dir_all(&temp_dir).map_err(e("create temp dir"))?;

    let ext = Path::new(&params.source_path)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();
    let is_executable = EXECUTABLE_EXTS.contains(&ext.as_str());

    let temp_file: PathBuf = if is_executable && params.image_type == "icon" {
        // Extract a 48px icon to icon.png
        let png = extract_icon_png(&params.source_path)?;
        let dest = temp_dir.join("icon.png");
        fs::write(&dest, &png).map_err(e("write icon"))?;
        dest
    } else {
        let file_name = format!("{}.{}", params.image_type, ext);
        let dest = temp_dir.join(&file_name);
        fs::copy(&params.source_path, &dest).map_err(e("copy image"))?;
        dest
    };

    let path_str = temp_file.to_string_lossy().to_string();
    Ok(ProcessImageResult {
        success: true,
        temp_path: Some(path_str.clone()),
        preview_url: Some(path_str),
        error: None,
    })
}

#[cfg(windows)]
fn extract_icon_png(source_path: &str) -> CmdResult<Vec<u8>> {
    // Shell icon via SHGetFileInfoW (32px "large" icon; Electron used 48px,
    // close enough for the sidebar/list usage), converted HICON -> RGBA -> PNG.
    use windows::core::PCWSTR;
    use windows::Win32::Graphics::Gdi::{
        DeleteObject, GetDC, GetDIBits, GetObjectW, ReleaseDC, BITMAP, BITMAPINFO,
        BITMAPINFOHEADER, DIB_RGB_COLORS,
    };
    use windows::Win32::Storage::FileSystem::FILE_ATTRIBUTE_NORMAL;
    use windows::Win32::UI::Shell::{SHGetFileInfoW, SHFILEINFOW, SHGFI_ICON, SHGFI_LARGEICON};
    use windows::Win32::UI::WindowsAndMessaging::{DestroyIcon, GetIconInfo, ICONINFO};

    unsafe {
        let wide: Vec<u16> = source_path
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();
        let mut sfi = SHFILEINFOW::default();
        let ok = SHGetFileInfoW(
            PCWSTR(wide.as_ptr()),
            FILE_ATTRIBUTE_NORMAL,
            Some(&mut sfi),
            std::mem::size_of::<SHFILEINFOW>() as u32,
            SHGFI_ICON | SHGFI_LARGEICON,
        );
        if ok == 0 || sfi.hIcon.is_invalid() {
            return Err("failed to get file icon".into());
        }

        let result = (|| -> CmdResult<Vec<u8>> {
            let mut info = ICONINFO::default();
            GetIconInfo(sfi.hIcon, &mut info).map_err(|err| format!("GetIconInfo: {err}"))?;

            let png = (|| -> CmdResult<Vec<u8>> {
                let mut bm = BITMAP::default();
                if GetObjectW(
                    info.hbmColor,
                    std::mem::size_of::<BITMAP>() as i32,
                    Some(&mut bm as *mut _ as *mut _),
                ) == 0
                {
                    return Err("GetObjectW failed".into());
                }
                let (w, h) = (bm.bmWidth, bm.bmHeight);
                if w <= 0 || h <= 0 {
                    return Err("invalid icon bitmap size".into());
                }

                let mut bmi = BITMAPINFO::default();
                bmi.bmiHeader = BITMAPINFOHEADER {
                    biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                    biWidth: w,
                    biHeight: -h, // top-down
                    biPlanes: 1,
                    biBitCount: 32,
                    ..Default::default()
                };

                let mut buf = vec![0u8; (w * h * 4) as usize];
                let hdc = GetDC(None);
                let lines = GetDIBits(
                    hdc,
                    info.hbmColor,
                    0,
                    h as u32,
                    Some(buf.as_mut_ptr() as *mut _),
                    &mut bmi,
                    DIB_RGB_COLORS,
                );
                ReleaseDC(None, hdc);
                if lines == 0 {
                    return Err("GetDIBits failed".into());
                }

                // BGRA -> RGBA
                for px in buf.chunks_exact_mut(4) {
                    px.swap(0, 2);
                }

                let img = image::RgbaImage::from_raw(w as u32, h as u32, buf)
                    .ok_or("bitmap buffer size mismatch")?;
                let mut png = Vec::new();
                image::DynamicImage::ImageRgba8(img)
                    .write_to(&mut std::io::Cursor::new(&mut png), image::ImageFormat::Png)
                    .map_err(|err| format!("encode png: {err}"))?;
                Ok(png)
            })();

            let _ = DeleteObject(info.hbmColor);
            let _ = DeleteObject(info.hbmMask);
            png
        })();

        let _ = DestroyIcon(sfi.hIcon);
        result
    }
}

#[cfg(not(windows))]
fn extract_icon_png(_source_path: &str) -> CmdResult<Vec<u8>> {
    Err("icon extraction is only supported on Windows".into())
}

/// Move temp images into library/images/<uuid>/ (copy + delete).
/// Single implementation (Electron duplicated this in gameManager + fileManager).
pub fn finalize_images(paths: &AppPaths, game_uuid: &str) -> CmdResult<Vec<MovedFile>> {
    let temp_dir = paths.temp_path.join("images").join(game_uuid);
    if !temp_dir.exists() {
        return Ok(vec![]);
    }
    let lib_dir = paths.img_path_game.join(game_uuid);
    fs::create_dir_all(&lib_dir).map_err(e("create library image dir"))?;

    let mut moved = Vec::new();
    for entry in fs::read_dir(&temp_dir).map_err(e("read temp dir"))? {
        let entry = entry.map_err(e("temp entry"))?;
        let file_name = entry.file_name().to_string_lossy().to_string();
        let dest = lib_dir.join(&file_name);
        fs::copy(entry.path(), &dest).map_err(e("copy to library"))?;
        let _ = fs::remove_file(entry.path());
        moved.push(MovedFile {
            file_name,
            new_path: dest.to_string_lossy().to_string(),
        });
    }
    let _ = fs::remove_dir(&temp_dir);
    Ok(moved)
}

/// Rewrite a game's image fields to library-relative forward-slash paths,
/// based on the files just moved by finalize_images.
pub fn apply_moved_image_paths(game: &mut Game, moved: &[MovedFile], app_data_path: &Path) {
    for file in moved {
        let stem = Path::new(&file.file_name)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("");
        let rel = Path::new(&file.new_path)
            .strip_prefix(app_data_path)
            .map(|p| p.to_string_lossy().replace('\\', "/"))
            .unwrap_or_else(|_| file.new_path.replace('\\', "/"));
        match stem {
            "icon" => game.icon_image = rel,
            "cover" => game.cover_image = rel,
            "background" => game.background_image = rel,
            _ => {}
        }
    }
}

/// Command wrapper around finalize_images (kept for API parity; add/update
/// already finalize internally).
#[tauri::command]
pub fn finalize_game_images(
    paths: tauri::State<AppPaths>,
    game_uuid: String,
) -> CmdResult<serde_json::Value> {
    let moved = finalize_images(&paths, &game_uuid)?;
    Ok(serde_json::json!({ "success": true, "movedFiles": moved }))
}

#[tauri::command]
pub fn cleanup_temp_images(
    paths: tauri::State<AppPaths>,
    game_uuid: String,
) -> CmdResult<serde_json::Value> {
    let temp_dir = paths.temp_path.join("images").join(&game_uuid);
    if temp_dir.exists() {
        fs::remove_dir_all(&temp_dir).map_err(e("remove temp dir"))?;
    }
    Ok(serde_json::json!({ "success": true }))
}

/// Grant the asset protocol read access to the data directories at runtime
/// (the config scope is static but the data dir is resolved at startup).
pub fn allow_asset_scope(app: &tauri::AppHandle, paths: &AppPaths) {
    let scope = app.asset_protocol_scope();
    let _ = scope.allow_directory(&paths.lib_path, true);
    let _ = scope.allow_directory(&paths.temp_path, true);
}
