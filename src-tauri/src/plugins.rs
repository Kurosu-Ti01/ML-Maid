//! Plugin infrastructure: discovery of installed plugins (plugins/<dir>/
//! with a manifest.json + entry script executed by the frontend in a Web
//! Worker sandbox) plus the HTTP services plugins rely on — a CORS-free
//! request proxy and remote image download into the temp image pipeline.

use std::collections::HashMap;
use std::fs;
use std::net::IpAddr;
use std::path::Path;
use std::sync::OnceLock;
use std::time::Duration;

use base64::Engine;
use serde::{Deserialize, Serialize};

use crate::file_manager::{clear_same_stem_files, ProcessImageResult};
use crate::paths::AppPaths;

type CmdResult<T> = Result<T, String>;

fn e<E: std::fmt::Display>(ctx: &str) -> impl FnOnce(E) -> String + '_ {
    move |err| format!("{ctx}: {err}")
}

/// Response caps: scraper API payloads vs downloaded artwork. Bodies are
/// streamed and cut off at the cap (Content-Length is not trusted).
const MAX_PROXY_RESPONSE_BYTES: usize = 10 * 1024 * 1024;
const MAX_IMAGE_BYTES: usize = 30 * 1024 * 1024;
const HTTP_TIMEOUT_SECS: u64 = 30;

fn http_client() -> &'static reqwest::Client {
    static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
    CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .user_agent(format!("ML-Maid/{}", env!("CARGO_PKG_VERSION")))
            .timeout(Duration::from_secs(HTTP_TIMEOUT_SECS))
            .connect_timeout(Duration::from_secs(10))
            .build()
            .expect("failed to build http client")
    })
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PluginManifest {
    /// Globally unique, e.g. "vndb-scraper"
    pub id: String,
    pub name: String,
    pub version: String,
    /// v1 supports "metadata-scraper"; unknown types are still listed so the
    /// settings UI can show them as unsupported
    #[serde(rename = "type")]
    pub plugin_type: String,
    pub api_version: u32,
    #[serde(default = "default_entry")]
    pub entry: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub author: String,
    #[serde(default)]
    pub homepage: String,
}

fn default_entry() -> String {
    "main.js".into()
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct InstalledPlugin {
    pub dir_name: String,
    pub manifest: PluginManifest,
}

fn read_manifest(path: &Path) -> CmdResult<PluginManifest> {
    let text = fs::read_to_string(path).map_err(e("read manifest"))?;
    let manifest: PluginManifest = serde_json::from_str(&text).map_err(e("parse manifest"))?;
    if manifest.id.trim().is_empty() {
        return Err("manifest id must not be empty".into());
    }
    Ok(manifest)
}

/// Scan plugins/ for one-level subdirectories with a manifest.json.
/// Broken plugins are skipped (logged) so one bad folder can't hide the rest.
#[tauri::command]
pub fn plugins_list(paths: tauri::State<AppPaths>) -> CmdResult<Vec<InstalledPlugin>> {
    let dir = &paths.plugins_path;
    if !dir.exists() {
        return Ok(vec![]);
    }
    let mut plugins = Vec::new();
    for entry in fs::read_dir(dir).map_err(e("read plugins dir"))? {
        let Ok(entry) = entry else { continue };
        let path = entry.path();
        if !path.is_dir() || !path.join("manifest.json").exists() {
            continue;
        }
        let dir_name = entry.file_name().to_string_lossy().to_string();
        match read_manifest(&path.join("manifest.json")) {
            Ok(manifest) => plugins.push(InstalledPlugin { dir_name, manifest }),
            Err(err) => eprintln!("Skipping plugin '{dir_name}': {err}"),
        }
    }
    plugins.sort_by(|a, b| {
        a.manifest
            .name
            .to_lowercase()
            .cmp(&b.manifest.name.to_lowercase())
    });
    Ok(plugins)
}

/// Only plain file/dir names may reach the filesystem: no separators, no
/// traversal, nothing hidden.
fn is_safe_name(name: &str) -> bool {
    !name.is_empty()
        && !name.starts_with('.')
        && !name.contains('/')
        && !name.contains('\\')
        && !name.contains("..")
}

#[tauri::command]
pub fn plugin_read_entry(paths: tauri::State<AppPaths>, dir_name: String) -> CmdResult<String> {
    if !is_safe_name(&dir_name) {
        return Err(format!("invalid plugin directory name: {dir_name}"));
    }
    let plugin_dir = paths.plugins_path.join(&dir_name);
    let manifest = read_manifest(&plugin_dir.join("manifest.json"))?;
    if !is_safe_name(&manifest.entry) {
        return Err(format!("invalid plugin entry: {}", manifest.entry));
    }
    fs::read_to_string(plugin_dir.join(&manifest.entry)).map_err(e("read plugin entry"))
}

/// Uninstall a plugin by removing its folder. Any stale disabled-state entry
/// is cleaned up by the frontend settings store.
#[tauri::command]
pub fn plugin_uninstall(paths: tauri::State<AppPaths>, dir_name: String) -> CmdResult<()> {
    if !is_safe_name(&dir_name) {
        return Err(format!("invalid plugin directory name: {dir_name}"));
    }
    let target = paths.plugins_path.join(&dir_name);
    if !target.exists() {
        return Ok(());
    }
    fs::remove_dir_all(&target).map_err(e("remove plugin"))
}

/// Plugins are hand-installed (the trust decision happens at install time),
/// but the proxy still refuses obvious non-web targets: only http(s), and no
/// loopback / private / link-local IP literals. Full SSRF hardening (DNS
/// rebinding etc.) is out of scope for v1.
fn validate_url(raw: &str) -> CmdResult<reqwest::Url> {
    let url = reqwest::Url::parse(raw).map_err(e("parse url"))?;
    match url.scheme() {
        "http" | "https" => {}
        other => return Err(format!("unsupported url scheme: {other}")),
    }
    let Some(host) = url.host_str() else {
        return Err("url has no host".into());
    };
    if host.eq_ignore_ascii_case("localhost") {
        return Err("requests to localhost are not allowed".into());
    }
    let ip_literal = host.trim_start_matches('[').trim_end_matches(']');
    if let Ok(ip) = ip_literal.parse::<IpAddr>() {
        let denied = match ip {
            IpAddr::V4(v4) => {
                v4.is_loopback() || v4.is_private() || v4.is_link_local() || v4.is_unspecified()
            }
            // fc00::/7 (unique local) and fe80::/10 (link local) lack stable
            // is_* methods, so match on the leading bits
            IpAddr::V6(v6) => {
                v6.is_loopback()
                    || v6.is_unspecified()
                    || (v6.segments()[0] & 0xfe00) == 0xfc00
                    || (v6.segments()[0] & 0xffc0) == 0xfe80
            }
        };
        if denied {
            return Err("requests to local/private addresses are not allowed".into());
        }
    }
    Ok(url)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HttpRequestParams {
    pub url: String,
    /// GET (default) / POST / HEAD
    #[serde(default)]
    pub method: Option<String>,
    #[serde(default)]
    pub headers: HashMap<String, String>,
    /// UTF-8 text only; binary uploads can come with a future apiVersion
    #[serde(default)]
    pub body: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HttpResponsePayload {
    pub status: u16,
    /// Lowercased names; duplicate headers joined with ", "
    pub headers: HashMap<String, String>,
    /// Always base64: legacy VN sites serve Shift_JIS/EUC-JP pages, so the
    /// worker picks the decoder (TextDecoder) instead of a lossy UTF-8 pass
    pub body_base64: String,
    /// URL after redirects, for resolving relative links in scraped pages
    pub final_url: String,
}

/// CORS-free HTTP proxy backing the plugin sandbox's host.fetch().
#[tauri::command]
pub async fn plugin_http_request(params: HttpRequestParams) -> CmdResult<HttpResponsePayload> {
    let url = validate_url(&params.url)?;

    let method = params.method.as_deref().unwrap_or("GET").to_uppercase();
    let method = match method.as_str() {
        "GET" => reqwest::Method::GET,
        "POST" => reqwest::Method::POST,
        "HEAD" => reqwest::Method::HEAD,
        other => return Err(format!("unsupported http method: {other}")),
    };

    let mut req = http_client().request(method, url);
    for (name, value) in &params.headers {
        req = req.header(name, value);
    }
    if let Some(body) = params.body {
        req = req.body(body);
    }

    let resp = req.send().await.map_err(e("http request"))?;
    let status = resp.status().as_u16();
    let final_url = resp.url().to_string();
    let mut headers: HashMap<String, String> = HashMap::new();
    for (name, value) in resp.headers() {
        let Ok(value) = value.to_str() else { continue };
        headers
            .entry(name.as_str().to_lowercase())
            .and_modify(|existing| {
                existing.push_str(", ");
                existing.push_str(value);
            })
            .or_insert_with(|| value.to_string());
    }

    let body = read_body_capped(resp, MAX_PROXY_RESPONSE_BYTES).await?;
    Ok(HttpResponsePayload {
        status,
        headers,
        body_base64: base64::engine::general_purpose::STANDARD.encode(&body),
        final_url,
    })
}

async fn read_body_capped(mut resp: reqwest::Response, cap: usize) -> CmdResult<Vec<u8>> {
    let mut body: Vec<u8> = Vec::new();
    while let Some(chunk) = resp.chunk().await.map_err(e("read response body"))? {
        if body.len() + chunk.len() > cap {
            return Err(format!(
                "response exceeds the {} MB limit",
                cap / (1024 * 1024)
            ));
        }
        body.extend_from_slice(&chunk);
    }
    Ok(body)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadImageParams {
    pub url: String,
    pub game_uuid: String,
    pub image_type: String,
}

const IMAGE_TYPES: &[&str] = &["icon", "background", "cover"];

fn is_valid_uuid(s: &str) -> bool {
    !s.is_empty() && s.chars().all(|c| c.is_ascii_hexdigit() || c == '-')
}

/// Magic-byte sniffing doubles as proof the payload really is an image;
/// headers and URL extensions are not trusted.
fn sniffed_ext(bytes: &[u8]) -> CmdResult<&'static str> {
    let format = image::guess_format(bytes)
        .map_err(|_| "the downloaded data is not a recognized image".to_string())?;
    match format {
        image::ImageFormat::Jpeg => Ok("jpg"),
        image::ImageFormat::Png => Ok("png"),
        image::ImageFormat::Gif => Ok("gif"),
        image::ImageFormat::Bmp => Ok("bmp"),
        image::ImageFormat::WebP => Ok("webp"),
        image::ImageFormat::Ico => Ok("ico"),
        other => Err(format!("unsupported image format: {other:?}")),
    }
}

/// Download a remote image into temp/images/<uuid>/<type>.<ext>, returning
/// the same shape as process_game_image so the existing preview / crop /
/// finalize-on-save flow applies unchanged.
#[tauri::command]
pub async fn download_game_image(
    paths: tauri::State<'_, AppPaths>,
    params: DownloadImageParams,
) -> CmdResult<ProcessImageResult> {
    match download_image_inner(&paths, &params).await {
        Ok(res) => Ok(res),
        Err(err) => Ok(ProcessImageResult {
            success: false,
            temp_path: None,
            preview_url: None,
            error: Some(err),
        }),
    }
}

async fn download_image_inner(
    paths: &AppPaths,
    params: &DownloadImageParams,
) -> CmdResult<ProcessImageResult> {
    if !IMAGE_TYPES.contains(&params.image_type.as_str()) {
        return Err(format!("unsupported image type: {}", params.image_type));
    }
    if !is_valid_uuid(&params.game_uuid) {
        return Err("invalid game uuid".into());
    }

    let url = validate_url(&params.url)?;
    let resp = http_client()
        .get(url)
        .send()
        .await
        .map_err(e("download image"))?;
    if !resp.status().is_success() {
        return Err(format!(
            "image download failed: HTTP {}",
            resp.status().as_u16()
        ));
    }

    let bytes = read_body_capped(resp, MAX_IMAGE_BYTES).await?;
    let ext = sniffed_ext(&bytes)?;

    let temp_dir = paths.temp_path.join("images").join(&params.game_uuid);
    fs::create_dir_all(&temp_dir).map_err(e("create temp dir"))?;
    clear_same_stem_files(&temp_dir, &params.image_type);

    let dest = temp_dir.join(format!("{}.{}", params.image_type, ext));
    fs::write(&dest, &bytes).map_err(e("write image"))?;

    let path_str = dest.to_string_lossy().to_string();
    Ok(ProcessImageResult {
        success: true,
        temp_path: Some(path_str.clone()),
        preview_url: Some(path_str),
        error: None,
    })
}

// ==========================================
//  Plugin archive import
// ==========================================

/// Total uncompressed size cap for an imported plugin archive
const MAX_ARCHIVE_TOTAL_BYTES: usize = 20 * 1024 * 1024;

/// Install a plugin from a distributed .zip archive. The manifest may sit at
/// the archive root or inside a single top-level folder (the natural result
/// of zipping the plugin directory). The target folder is named after the
/// manifest id; an existing installation is replaced (upgrade path).
///
/// Everything is read and validated in memory first — a rejected archive
/// leaves the plugins directory untouched.
#[tauri::command]
pub fn plugin_install_archive(
    paths: tauri::State<AppPaths>,
    archive_path: String,
) -> CmdResult<InstalledPlugin> {
    install_archive_inner(&paths.plugins_path, &archive_path)
}

fn install_archive_inner(plugins_path: &Path, archive_path: &str) -> CmdResult<InstalledPlugin> {
    let file = fs::File::open(archive_path).map_err(e("open archive"))?;
    let mut archive = zip::ZipArchive::new(file).map_err(e("read archive"))?;

    let names: Vec<String> = (0..archive.len())
        .filter_map(|i| {
            archive
                .by_index(i)
                .ok()
                .map(|f| f.name().replace('\\', "/"))
        })
        .collect();
    let prefix = find_manifest_prefix(&names)
        .ok_or("no manifest.json found at the archive root or in a single top-level folder")?;

    // Collect (relative path, bytes) with traversal and size checks
    use std::io::Read;
    let mut files: Vec<(String, Vec<u8>)> = Vec::new();
    let mut total = 0usize;
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(e("read archive entry"))?;
        if entry.is_dir() {
            continue;
        }
        // enclosed_name rejects absolute paths and `..` components (zip-slip)
        let Some(safe) = entry.enclosed_name() else {
            return Err(format!("unsafe path in archive: {}", entry.name()));
        };
        let name = safe.to_string_lossy().replace('\\', "/");
        let Some(rel) = name.strip_prefix(&prefix) else {
            continue; // stray file outside the plugin folder (e.g. __MACOSX)
        };
        if rel.is_empty() {
            continue;
        }
        let mut buf = Vec::new();
        let remaining = (MAX_ARCHIVE_TOTAL_BYTES - total) as u64;
        (&mut entry)
            .take(remaining + 1)
            .read_to_end(&mut buf)
            .map_err(e("extract archive entry"))?;
        total += buf.len();
        if total > MAX_ARCHIVE_TOTAL_BYTES {
            return Err(format!(
                "archive exceeds the {} MB limit",
                MAX_ARCHIVE_TOTAL_BYTES / (1024 * 1024)
            ));
        }
        files.push((rel.to_string(), buf));
    }

    let manifest_bytes = &files
        .iter()
        .find(|(rel, _)| rel == "manifest.json")
        .ok_or("archive has no manifest.json")?
        .1;
    let manifest_text = String::from_utf8(manifest_bytes.clone()).map_err(e("decode manifest"))?;
    let manifest: PluginManifest =
        serde_json::from_str(&manifest_text).map_err(e("parse manifest"))?;
    if !is_safe_name(manifest.id.trim()) {
        return Err(format!(
            "manifest id is not a valid folder name: {}",
            manifest.id
        ));
    }
    if !is_safe_name(&manifest.entry) {
        return Err(format!("invalid plugin entry: {}", manifest.entry));
    }
    if !files.iter().any(|(rel, _)| rel == &manifest.entry) {
        return Err(format!(
            "entry script '{}' is missing from the archive",
            manifest.entry
        ));
    }

    // Validated: replace any existing installation and write everything out
    let dir_name = manifest.id.trim().to_string();
    let target = plugins_path.join(&dir_name);
    if target.exists() {
        fs::remove_dir_all(&target).map_err(e("remove old plugin"))?;
    }
    for (rel, bytes) in &files {
        let dest = target.join(rel.replace('/', std::path::MAIN_SEPARATOR_STR));
        if let Some(parent) = dest.parent() {
            fs::create_dir_all(parent).map_err(e("create plugin dir"))?;
        }
        fs::write(&dest, bytes).map_err(e("write plugin file"))?;
    }

    Ok(InstalledPlugin { dir_name, manifest })
}

/// "" when manifest.json is at the root, "<dir>/" when it sits in exactly one
/// top-level folder, None otherwise.
fn find_manifest_prefix(names: &[String]) -> Option<String> {
    if names.iter().any(|n| n == "manifest.json") {
        return Some(String::new());
    }
    let mut prefixes: Vec<&str> = names
        .iter()
        .filter_map(|n| n.strip_suffix("/manifest.json"))
        .filter(|p| !p.contains('/'))
        .collect();
    prefixes.sort();
    prefixes.dedup();
    match prefixes[..] {
        [only] => Some(format!("{only}/")),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn manifest_parses_with_defaults() {
        let m: PluginManifest = serde_json::from_str(
            r#"{
                "id": "vndb-scraper",
                "name": "VNDB",
                "version": "1.0.0",
                "type": "metadata-scraper",
                "apiVersion": 1
            }"#,
        )
        .unwrap();
        assert_eq!(m.entry, "main.js");
        assert_eq!(m.plugin_type, "metadata-scraper");
        assert_eq!(m.api_version, 1);
        assert_eq!(m.description, "");
    }

    #[test]
    fn manifest_accepts_unknown_type_and_extra_fields() {
        let m: PluginManifest = serde_json::from_str(
            r#"{
                "id": "x",
                "name": "X",
                "version": "0.1.0",
                "type": "theme",
                "apiVersion": 2,
                "futureField": true
            }"#,
        )
        .unwrap();
        assert_eq!(m.plugin_type, "theme");
    }

    #[test]
    fn manifest_rejects_missing_required_fields() {
        let res: Result<PluginManifest, _> = serde_json::from_str(r#"{ "id": "x", "name": "X" }"#);
        assert!(res.is_err());
    }

    #[test]
    fn safe_name_rejects_traversal_and_hidden() {
        for bad in ["", ".", "..", ".hidden", "a/b", "a\\b", "a..b"] {
            assert!(!is_safe_name(bad), "{bad:?} should be rejected");
        }
        for good in ["vndb-scraper", "main.js", "My Plugin 2"] {
            assert!(is_safe_name(good), "{good:?} should be accepted");
        }
    }

    #[test]
    fn url_validation_allows_public_web_only() {
        for good in ["https://api.vndb.org/kana/vn", "http://example.com/a"] {
            assert!(validate_url(good).is_ok(), "{good} should be allowed");
        }
        for bad in [
            "file:///C:/Windows/system.ini",
            "ftp://example.com/x",
            "https://localhost/api",
            "http://127.0.0.1:8080/",
            "http://10.0.0.1/",
            "http://192.168.1.1/router",
            "http://169.254.169.254/metadata",
            "http://[::1]/",
            "http://[fe80::1]/",
            "http://0.0.0.0/",
            "not a url",
        ] {
            assert!(validate_url(bad).is_err(), "{bad} should be rejected");
        }
    }

    #[test]
    fn uuid_validation() {
        assert!(is_valid_uuid("123e4567-e89b-12d3-a456-426614174000"));
        assert!(!is_valid_uuid(""));
        assert!(!is_valid_uuid("../evil"));
        assert!(!is_valid_uuid("abc/def"));
    }

    #[test]
    fn sniffing_detects_png_and_rejects_garbage() {
        let mut png = Vec::new();
        let img = image::RgbaImage::from_pixel(2, 2, image::Rgba([1, 2, 3, 255]));
        image::DynamicImage::ImageRgba8(img)
            .write_to(&mut std::io::Cursor::new(&mut png), image::ImageFormat::Png)
            .unwrap();
        assert_eq!(sniffed_ext(&png).unwrap(), "png");
        assert!(sniffed_ext(b"<html>not an image</html>").is_err());
    }

    // ---- archive import ----

    fn build_zip(entries: &[(&str, &str)]) -> Vec<u8> {
        use std::io::Write;
        let mut buf = std::io::Cursor::new(Vec::new());
        let mut w = zip::ZipWriter::new(&mut buf);
        let opts = zip::write::SimpleFileOptions::default();
        for (name, content) in entries {
            w.start_file(*name, opts).unwrap();
            w.write_all(content.as_bytes()).unwrap();
        }
        w.finish().unwrap();
        buf.into_inner()
    }

    fn temp_zip(tag: &str, bytes: &[u8]) -> std::path::PathBuf {
        let path = std::env::temp_dir().join(format!(
            "ml-maid-plugin-zip-{tag}-{}.zip",
            std::process::id()
        ));
        fs::write(&path, bytes).unwrap();
        path
    }

    const MANIFEST: &str = r#"{ "id": "demo", "name": "Demo", "version": "1.0.0",
        "type": "metadata-scraper", "apiVersion": 1 }"#;

    #[test]
    fn manifest_prefix_detection() {
        let root = vec!["manifest.json".to_string(), "main.js".to_string()];
        assert_eq!(find_manifest_prefix(&root), Some(String::new()));

        let nested = vec!["demo/manifest.json".to_string(), "demo/main.js".to_string()];
        assert_eq!(find_manifest_prefix(&nested), Some("demo/".to_string()));

        let too_deep = vec!["a/b/manifest.json".to_string()];
        assert_eq!(find_manifest_prefix(&too_deep), None);

        let ambiguous = vec!["a/manifest.json".to_string(), "b/manifest.json".to_string()];
        assert_eq!(find_manifest_prefix(&ambiguous), None);
    }

    #[test]
    fn archive_install_root_and_nested_layouts() {
        let plugins_dir =
            std::env::temp_dir().join(format!("ml-maid-plugin-install-{}", std::process::id()));
        let _ = fs::remove_dir_all(&plugins_dir);

        // Nested layout (zipped folder), replaces a previous install
        let zip = temp_zip(
            "nested",
            &build_zip(&[
                ("demo/manifest.json", MANIFEST),
                ("demo/main.js", "MLMaid.register({})"),
                ("__MACOSX/junk", "ignored"),
            ]),
        );
        let installed = install_archive_inner(&plugins_dir, zip.to_str().unwrap()).unwrap();
        assert_eq!(installed.dir_name, "demo");
        assert!(plugins_dir.join("demo").join("main.js").exists());
        assert!(!plugins_dir.join("demo").join("junk").exists());

        // Root layout upgrade overwrites the folder
        let zip2 = temp_zip(
            "root",
            &build_zip(&[("manifest.json", MANIFEST), ("main.js", "// v2")]),
        );
        install_archive_inner(&plugins_dir, zip2.to_str().unwrap()).unwrap();
        let code = fs::read_to_string(plugins_dir.join("demo").join("main.js")).unwrap();
        assert_eq!(code, "// v2");

        let _ = fs::remove_dir_all(&plugins_dir);
        let _ = fs::remove_file(&zip);
        let _ = fs::remove_file(&zip2);
    }

    #[test]
    fn archive_install_rejects_bad_archives() {
        let plugins_dir =
            std::env::temp_dir().join(format!("ml-maid-plugin-badzip-{}", std::process::id()));
        let _ = fs::remove_dir_all(&plugins_dir);

        // No manifest anywhere
        let no_manifest = temp_zip("nomanifest", &build_zip(&[("main.js", "x")]));
        assert!(install_archive_inner(&plugins_dir, no_manifest.to_str().unwrap()).is_err());

        // Entry script named in the manifest is missing
        let no_entry = temp_zip("noentry", &build_zip(&[("manifest.json", MANIFEST)]));
        assert!(install_archive_inner(&plugins_dir, no_entry.to_str().unwrap()).is_err());

        // Nothing was written for either
        assert!(!plugins_dir.exists());

        let _ = fs::remove_file(&no_manifest);
        let _ = fs::remove_file(&no_entry);
    }
}
