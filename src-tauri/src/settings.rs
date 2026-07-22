use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};

// Settings shape mirrors the renderer's `Settings` interface and the INI file
// layout written by the Electron version (npm `ini` package):
//   [general] theme=... language=... minimizeToTray=true
//   [sorting] sortBy=... sortOrder=...
//   [filtering] genres[]=A  genres[]=B  ... (empty arrays omitted)
//   [appearance.light] / [appearance.dark] glassBg=rgba(...) glassBlur=12 ...
//     (npm `ini` dotted-section nesting; only user-customized keys are written,
//      absent keys fall back to the CSS defaults in the renderer)

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct GeneralSettings {
    pub theme: String,
    pub language: String,
    pub minimize_to_tray: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SortingSettings {
    pub sort_by: String,
    pub sort_order: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct FilteringSettings {
    #[serde(default)]
    pub genres: Vec<String>,
    #[serde(default)]
    pub developers: Vec<String>,
    #[serde(default)]
    pub publishers: Vec<String>,
    #[serde(default)]
    pub tags: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct LauncherSettings {
    /// Path to Locale Emulator's LEProc.exe (empty = not configured)
    #[serde(default)]
    pub locale_emulator_path: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct PluginsSettings {
    /// Disabled plugin ids; absent = enabled, so new plugins work out of
    /// the box and uninstalled ones leave no meaningful residue
    #[serde(default)]
    pub disabled: Vec<String>,
}

/// Per-theme glass/ambient overrides. `None` = use the CSS default.
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct AppearanceTheme {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub glass_bg: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub glass_strong: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub glass_border: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub glass_blur: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ambient_opacity: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ambient_blur: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ambient_saturate: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ambient_brightness: Option<f64>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct AppearanceSettings {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub light: Option<AppearanceTheme>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub dark: Option<AppearanceTheme>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub general: GeneralSettings,
    #[serde(default = "default_sorting")]
    pub sorting: SortingSettings,
    #[serde(default)]
    pub filtering: FilteringSettings,
    #[serde(default)]
    pub launcher: LauncherSettings,
    #[serde(default)]
    pub appearance: AppearanceSettings,
    #[serde(default)]
    pub plugins: PluginsSettings,
}

fn default_sorting() -> SortingSettings {
    SortingSettings {
        sort_by: "name".into(),
        sort_order: "ascending".into(),
    }
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            general: GeneralSettings {
                theme: "auto".into(),
                language: "en-US".into(),
                minimize_to_tray: true,
            },
            sorting: default_sorting(),
            filtering: FilteringSettings::default(),
            launcher: LauncherSettings::default(),
            appearance: AppearanceSettings::default(),
            plugins: PluginsSettings::default(),
        }
    }
}

pub struct SettingsState {
    config_file: PathBuf,
    pub settings: Mutex<Settings>,
}

impl SettingsState {
    pub fn load(config_dir: &std::path::Path) -> Result<Self, String> {
        fs::create_dir_all(config_dir).map_err(|e| format!("create config dir: {e}"))?;
        let config_file = config_dir.join("settings.conf");

        let settings = if config_file.exists() {
            let content = fs::read_to_string(&config_file)
                .map_err(|e| format!("read settings.conf: {e}"))?;
            parse_ini(&content)
        } else {
            let defaults = Settings::default();
            fs::write(&config_file, to_ini(&defaults))
                .map_err(|e| format!("write settings.conf: {e}"))?;
            defaults
        };

        Ok(SettingsState {
            config_file,
            settings: Mutex::new(settings),
        })
    }

    pub fn save(&self, new_settings: Settings) -> Result<(), String> {
        fs::write(&self.config_file, to_ini(&new_settings))
            .map_err(|e| format!("write settings.conf: {e}"))?;
        *self.settings.lock().unwrap() = new_settings;
        Ok(())
    }

    pub fn get(&self) -> Settings {
        self.settings.lock().unwrap().clone()
    }
}

// ==========================================
//  Minimal INI reader/writer (npm `ini` compatible for our schema)
// ==========================================

fn parse_ini(content: &str) -> Settings {
    let mut settings = Settings::default();
    let mut section = String::new();

    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with(';') || line.starts_with('#') {
            continue;
        }
        if line.starts_with('[') && line.ends_with(']') {
            section = line[1..line.len() - 1].trim().to_string();
            continue;
        }
        let Some((raw_key, raw_value)) = line.split_once('=') else {
            continue;
        };
        let key = raw_key.trim();
        let value = raw_value.trim().to_string();

        match (section.as_str(), key) {
            ("general", "theme") => settings.general.theme = value,
            ("general", "language") => settings.general.language = value,
            ("general", "minimizeToTray") => settings.general.minimize_to_tray = value == "true",
            ("sorting", "sortBy") => settings.sorting.sort_by = value,
            ("sorting", "sortOrder") => settings.sorting.sort_order = value,
            ("filtering", "genres[]") => settings.filtering.genres.push(value),
            ("filtering", "developers[]") => settings.filtering.developers.push(value),
            ("filtering", "publishers[]") => settings.filtering.publishers.push(value),
            ("filtering", "tags[]") => settings.filtering.tags.push(value),
            ("launcher", "localeEmulatorPath") => settings.launcher.locale_emulator_path = value,
            ("plugins", "disabled[]") => settings.plugins.disabled.push(value),
            ("appearance.light", k) => {
                let theme = settings.appearance.light.get_or_insert_default();
                apply_appearance_key(theme, k, &value);
            }
            ("appearance.dark", k) => {
                let theme = settings.appearance.dark.get_or_insert_default();
                apply_appearance_key(theme, k, &value);
            }
            _ => {} // unknown keys are ignored
        }
    }

    settings
}

fn apply_appearance_key(theme: &mut AppearanceTheme, key: &str, value: &str) {
    match key {
        "glassBg" => theme.glass_bg = Some(value.to_string()),
        "glassStrong" => theme.glass_strong = Some(value.to_string()),
        "glassBorder" => theme.glass_border = Some(value.to_string()),
        "glassBlur" => theme.glass_blur = value.parse().ok(),
        "ambientOpacity" => theme.ambient_opacity = value.parse().ok(),
        "ambientBlur" => theme.ambient_blur = value.parse().ok(),
        "ambientSaturate" => theme.ambient_saturate = value.parse().ok(),
        "ambientBrightness" => theme.ambient_brightness = value.parse().ok(),
        _ => {} // unknown keys are ignored
    }
}

fn to_ini(s: &Settings) -> String {
    let mut out = String::new();

    out.push_str("[general]\n");
    out.push_str(&format!("theme={}\n", s.general.theme));
    out.push_str(&format!("language={}\n", s.general.language));
    out.push_str(&format!("minimizeToTray={}\n", s.general.minimize_to_tray));

    out.push_str("\n[sorting]\n");
    out.push_str(&format!("sortBy={}\n", s.sorting.sort_by));
    out.push_str(&format!("sortOrder={}\n", s.sorting.sort_order));

    // npm `ini` omits empty arrays; skip the section entirely when all empty
    let f = &s.filtering;
    if !(f.genres.is_empty()
        && f.developers.is_empty()
        && f.publishers.is_empty()
        && f.tags.is_empty())
    {
        out.push_str("\n[filtering]\n");
        for (key, values) in [
            ("genres", &f.genres),
            ("developers", &f.developers),
            ("publishers", &f.publishers),
            ("tags", &f.tags),
        ] {
            for v in values {
                out.push_str(&format!("{key}[]={v}\n"));
            }
        }
    }

    if !s.launcher.locale_emulator_path.is_empty() {
        out.push_str("\n[launcher]\n");
        out.push_str(&format!(
            "localeEmulatorPath={}\n",
            s.launcher.locale_emulator_path
        ));
    }

    if !s.plugins.disabled.is_empty() {
        out.push_str("\n[plugins]\n");
        for id in &s.plugins.disabled {
            out.push_str(&format!("disabled[]={id}\n"));
        }
    }

    append_appearance_theme(&mut out, "appearance.light", &s.appearance.light);
    append_appearance_theme(&mut out, "appearance.dark", &s.appearance.dark);

    out
}

// Only user-customized keys are written; a theme with nothing set is omitted
fn append_appearance_theme(out: &mut String, section: &str, theme: &Option<AppearanceTheme>) {
    let Some(t) = theme else { return };

    let mut lines = String::new();
    if let Some(v) = &t.glass_bg {
        lines.push_str(&format!("glassBg={v}\n"));
    }
    if let Some(v) = &t.glass_strong {
        lines.push_str(&format!("glassStrong={v}\n"));
    }
    if let Some(v) = &t.glass_border {
        lines.push_str(&format!("glassBorder={v}\n"));
    }
    if let Some(v) = t.glass_blur {
        lines.push_str(&format!("glassBlur={v}\n"));
    }
    if let Some(v) = t.ambient_opacity {
        lines.push_str(&format!("ambientOpacity={v}\n"));
    }
    if let Some(v) = t.ambient_blur {
        lines.push_str(&format!("ambientBlur={v}\n"));
    }
    if let Some(v) = t.ambient_saturate {
        lines.push_str(&format!("ambientSaturate={v}\n"));
    }
    if let Some(v) = t.ambient_brightness {
        lines.push_str(&format!("ambientBrightness={v}\n"));
    }

    if !lines.is_empty() {
        out.push_str(&format!("\n[{section}]\n{lines}"));
    }
}

// ==========================================
//  Commands
// ==========================================

#[tauri::command]
pub fn settings_get(state: tauri::State<SettingsState>) -> Settings {
    state.get()
}

#[tauri::command]
pub fn settings_save(
    app: tauri::AppHandle,
    state: tauri::State<SettingsState>,
    settings: Settings,
) -> Result<bool, String> {
    let language_changed = state.get().general.language != settings.general.language;
    let language = settings.general.language.clone();

    state.save(settings)?;

    if language_changed {
        crate::update_tray_language(&app, &language);
    }

    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A settings.conf written by the Electron app (npm `ini`) parses and
    /// re-serializes without losing values.
    #[test]
    fn ini_round_trip_electron_file() {
        let electron_written = "[general]\ntheme=light\nlanguage=en-US\nminimizeToTray=false\n\n[sorting]\nsortBy=score\nsortOrder=descending\n";
        let parsed = parse_ini(electron_written);
        assert_eq!(parsed.general.theme, "light");
        assert!(!parsed.general.minimize_to_tray);
        assert_eq!(parsed.sorting.sort_by, "score");
        assert_eq!(parsed.sorting.sort_order, "descending");
        assert!(parsed.filtering.genres.is_empty());

        // Round trip preserves every value
        let reparsed = parse_ini(&to_ini(&parsed));
        assert_eq!(reparsed.general.theme, parsed.general.theme);
        assert_eq!(reparsed.general.language, parsed.general.language);
        assert_eq!(reparsed.general.minimize_to_tray, parsed.general.minimize_to_tray);
        assert_eq!(reparsed.sorting.sort_by, parsed.sorting.sort_by);
        assert_eq!(reparsed.sorting.sort_order, parsed.sorting.sort_order);
    }

    /// Arrays use the npm `ini` `key[]=value` form; empty arrays are omitted.
    #[test]
    fn ini_arrays() {
        let mut s = Settings::default();
        s.filtering.genres = vec!["ADV".into(), "RPG".into()];
        s.filtering.tags = vec!["fan disc".into()];

        let ini = to_ini(&s);
        assert!(ini.contains("genres[]=ADV\n"));
        assert!(ini.contains("genres[]=RPG\n"));
        assert!(ini.contains("tags[]=fan disc\n"));
        assert!(!ini.contains("developers[]"));

        let parsed = parse_ini(&ini);
        assert_eq!(parsed.filtering.genres, vec!["ADV", "RPG"]);
        assert_eq!(parsed.filtering.tags, vec!["fan disc"]);
    }

    /// Appearance sections round-trip: set keys survive (including rgba values
    /// containing commas and spaces), unset keys stay `None`.
    #[test]
    fn ini_appearance_round_trip() {
        let mut s = Settings::default();
        s.appearance.light = Some(AppearanceTheme {
            glass_bg: Some("rgba(255, 255, 255, 0.35)".into()),
            glass_blur: Some(12.0),
            ambient_opacity: Some(0.2),
            ..Default::default()
        });
        s.appearance.dark = Some(AppearanceTheme {
            glass_strong: Some("rgba(24, 24, 27, 0.7)".into()),
            ambient_brightness: Some(1.3),
            ..Default::default()
        });

        let ini = to_ini(&s);
        assert!(ini.contains("[appearance.light]\nglassBg=rgba(255, 255, 255, 0.35)\n"));
        assert!(ini.contains("[appearance.dark]\nglassStrong=rgba(24, 24, 27, 0.7)\n"));

        let parsed = parse_ini(&ini);
        let light = parsed.appearance.light.as_ref().unwrap();
        assert_eq!(light.glass_bg.as_deref(), Some("rgba(255, 255, 255, 0.35)"));
        assert_eq!(light.glass_blur, Some(12.0));
        assert_eq!(light.ambient_opacity, Some(0.2));
        assert_eq!(light.glass_strong, None); // unset stays unset
        let dark = parsed.appearance.dark.as_ref().unwrap();
        assert_eq!(dark.glass_strong.as_deref(), Some("rgba(24, 24, 27, 0.7)"));
        assert_eq!(dark.ambient_brightness, Some(1.3));
        assert_eq!(dark.glass_bg, None);
    }

    /// Configs from before the appearance feature parse with no themes set,
    /// and defaults serialize without any appearance section.
    #[test]
    fn ini_appearance_absent() {
        let parsed = parse_ini("[general]\ntheme=auto\nlanguage=en-US\nminimizeToTray=true\n");
        assert!(parsed.appearance.light.is_none());
        assert!(parsed.appearance.dark.is_none());
        assert!(!to_ini(&parsed).contains("[appearance"));
    }

    /// Disabled plugin ids round-trip; an empty list writes no section.
    #[test]
    fn ini_plugins_round_trip() {
        let mut s = Settings::default();
        assert!(!to_ini(&s).contains("[plugins]"));

        s.plugins.disabled = vec!["vndb-scraper".into(), "other one".into()];
        let ini = to_ini(&s);
        assert!(ini.contains("[plugins]\ndisabled[]=vndb-scraper\ndisabled[]=other one\n"));

        let parsed = parse_ini(&ini);
        assert_eq!(parsed.plugins.disabled, vec!["vndb-scraper", "other one"]);

        // Configs from before the plugin feature parse as "all enabled"
        let old = parse_ini("[general]\ntheme=auto\nlanguage=en-US\nminimizeToTray=true\n");
        assert!(old.plugins.disabled.is_empty());
    }
}
