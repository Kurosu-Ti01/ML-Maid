use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};

// Settings shape mirrors the renderer's `Settings` interface and the INI file
// layout written by the Electron version (npm `ini` package):
//   [general] theme=... language=... minimizeToTray=true
//   [sorting] sortBy=... sortOrder=...
//   [filtering] genres[]=A  genres[]=B  ... (empty arrays omitted)

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

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub general: GeneralSettings,
    #[serde(default = "default_sorting")]
    pub sorting: SortingSettings,
    #[serde(default)]
    pub filtering: FilteringSettings,
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
            _ => {} // unknown keys are ignored
        }
    }

    settings
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

    out
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
}
