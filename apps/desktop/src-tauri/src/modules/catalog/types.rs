use super::search::CatalogSearch;
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    ops::Deref,
    sync::atomic::{AtomicU64, Ordering},
    sync::{Arc, Mutex},
};

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct App {
    /// Database row identifier for persisted app records.
    pub id: i64,
    /// Stable app identifier used as the canonical app key across platforms.
    pub app_id: String,
    /// macOS bundle identifier when the app provides one.
    pub bundle_id: Option<String>,
    pub name: String,
    /// Executable or bundle path used to derive stable IDs for unbundled apps.
    pub process_path: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct Website {
    /// Database row identifier for persisted website records.
    pub id: i64,
    /// Canonical website domain used as the stable website key.
    pub domain: String,
    pub name: String,
    pub icon: Option<String>,
    pub color: Option<String>,
}

// MARK: - DTOs

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum CatalogSearchResultDto {
    #[serde(rename = "app")]
    App {
        app: CatalogAppSearchResultDto,
        score: u32,
    },
    #[serde(rename = "website")]
    Website {
        website: CatalogWebsiteSearchResultDto,
        score: u32,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CatalogAppSearchResultDto {
    /// Stable app identifier used as the canonical app key across platforms.
    pub app_id: String,
    /// macOS bundle identifier when the app provides one.
    pub bundle_id: Option<String>,
    pub name: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CatalogWebsiteSearchResultDto {
    /// Canonical website domain used as the stable website key.
    pub domain: String,
    pub name: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum CatalogIconMode {
    None,
    Await,
    Lazy,
}

impl Default for CatalogIconMode {
    fn default() -> Self {
        return Self::Await;
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CatalogIconDto {
    pub icon: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct CatalogIconLoadedEvent {
    pub target_key: String,
    pub asset: CatalogIconDto,
}

// MARK: - State

pub struct CatalogSearchState(Arc<Mutex<CatalogSearch>>);

impl CatalogSearchState {
    pub fn init() -> Self {
        return Self(Arc::new(Mutex::new(CatalogSearch::new())));
    }

    pub fn arc(&self) -> Arc<Mutex<CatalogSearch>> {
        return Arc::clone(&self.0);
    }
}

impl Deref for CatalogSearchState {
    type Target = Mutex<CatalogSearch>;

    fn deref(&self) -> &Self::Target {
        return &self.0;
    }
}

/// Stores shared catalog icon assets and the latest lazy search session.
///
/// Lazy icon resolution currently assumes one active catalog search flow per app process.
#[derive(Clone)]
pub struct CatalogAssetsState {
    cache: Arc<Mutex<HashMap<String, CatalogIconDto>>>,
    current_session_id: Arc<AtomicU64>,
}

impl CatalogAssetsState {
    pub fn init() -> Self {
        return Self {
            cache: Arc::new(Mutex::new(HashMap::new())),
            current_session_id: Arc::new(AtomicU64::new(0)),
        };
    }

    /// Advances the active catalog asset session and returns its identifier.
    pub fn advance_session(&self) -> u64 {
        return self.current_session_id.fetch_add(1, Ordering::SeqCst) + 1;
    }

    /// Returns whether the session is still the latest lazy catalog search.
    pub fn is_session_current(&self, session_id: u64) -> bool {
        return self.current_session_id.load(Ordering::SeqCst) == session_id;
    }

    /// Returns a cached icon asset for a stable catalog target key.
    pub fn cached_icon(&self, target_key: &str) -> Result<Option<CatalogIconDto>, String> {
        return self
            .cache
            .lock()
            .map_err(|_| "Catalog asset cache is unavailable".to_string())
            .map(|cache| cache.get(target_key).cloned());
    }

    /// Stores an icon asset for a stable catalog target key.
    pub fn cache_icon(&self, target_key: String, icon: CatalogIconDto) -> Result<(), String> {
        return self
            .cache
            .lock()
            .map_err(|_| "Catalog asset cache is unavailable".to_string())
            .map(|mut cache| {
                cache.insert(target_key, icon);
            });
    }
}
