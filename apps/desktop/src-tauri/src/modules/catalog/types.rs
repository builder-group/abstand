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

impl Deref for CatalogAssetsState {
    type Target = Mutex<CatalogAssets>;

    fn deref(&self) -> &Self::Target {
        return &self.0;
    }
}
