use super::{assets::CatalogAssets, search::CatalogSearch};
use serde::{Deserialize, Serialize};
use std::{
    ops::Deref,
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
pub struct CatalogSearchResponseDto {
    pub results: Vec<CatalogSearchResultDto>,
    pub lazy_session_id: Option<u64>,
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

pub struct CatalogAssetsState(Arc<Mutex<CatalogAssets>>);

impl CatalogAssetsState {
    pub fn init() -> Self {
        return Self(Arc::new(Mutex::new(CatalogAssets::new())));
    }

    pub fn arc(&self) -> Arc<Mutex<CatalogAssets>> {
        return Arc::clone(&self.0);
    }
}

impl Clone for CatalogAssetsState {
    fn clone(&self) -> Self {
        return Self(self.arc());
    }
}

impl Deref for CatalogAssetsState {
    type Target = Mutex<CatalogAssets>;

    fn deref(&self) -> &Self::Target {
        return &self.0;
    }
}
