use super::{
    assets::{CatalogAsset, CatalogAssets},
    search::CatalogSearch,
};
use serde::{Deserialize, Serialize};
use std::{
    ops::Deref,
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc, Mutex,
    },
};

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct App {
    /// Database row identifier for persisted app records.
    pub id: i64,
    /// Stable app identifier used as the canonical app key across platforms.
    pub stable_id: String,
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

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum CatalogItemId {
    App {
        #[serde(rename = "stableId")]
        stable_id: String,
        // Required for icon resolution on macOS; not part of the cache key.
        #[serde(rename = "bundleId")]
        bundle_id: Option<String>,
    },
    Website {
        domain: String,
    },
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

#[derive(Clone)]
pub struct CatalogAssetsState {
    assets: Arc<Mutex<CatalogAssets>>,
    generation: Arc<AtomicU64>,
}

impl CatalogAssetsState {
    pub fn init() -> Self {
        return Self {
            assets: Arc::new(Mutex::new(CatalogAssets::new())),
            generation: Arc::new(AtomicU64::new(0)),
        };
    }

    pub fn arc(&self) -> Arc<Mutex<CatalogAssets>> {
        return Arc::clone(&self.assets);
    }

    pub fn generation_arc(&self) -> Arc<AtomicU64> {
        return Arc::clone(&self.generation);
    }

    pub fn next_generation(&self) -> u64 {
        return self.generation.fetch_add(1, Ordering::SeqCst) + 1;
    }
}

impl Deref for CatalogAssetsState {
    type Target = Mutex<CatalogAssets>;

    fn deref(&self) -> &Self::Target {
        return &self.assets;
    }
}

// MARK: - Events

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct CatalogAssetLoadedEvent {
    pub item_id: CatalogItemId,
    pub icon: Option<String>,
    pub color: Option<String>,
}

impl CatalogAssetLoadedEvent {
    pub fn from_asset(item_id: &CatalogItemId, asset: &CatalogAsset) -> Self {
        return Self {
            item_id: item_id.clone(),
            icon: asset.icon.clone(),
            color: asset.color.clone(),
        };
    }
}
