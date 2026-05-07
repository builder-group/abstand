use crate::modules::catalog::types::{CatalogAssetLoadedEvent, CatalogAssetsState, CatalogItemId};
#[cfg(target_os = "macos")]
use mado::get_app_icon;
use std::collections::HashMap;
use std::sync::atomic::Ordering;
use std::sync::{Arc, Mutex};
use tauri::AppHandle;
use tauri_specta::Event;

pub fn load_assets(
    app: AppHandle,
    assets_state: CatalogAssetsState,
    item_ids: Vec<CatalogItemId>,
    include_color: bool,
) {
    if item_ids.is_empty() {
        return;
    }

    // Each call gets a new generation so the spawned thread can detect when a newer
    // search has started and stop early. See: https://github.com/orgs/tauri-apps/discussions/5894
    let generation = assets_state.next_generation();
    let generation_state = assets_state.generation_arc();

    let assets = assets_state.arc();

    tauri::async_runtime::spawn_blocking(move || {
        for item_id in &item_ids {
            if generation_state.load(Ordering::SeqCst) != generation {
                break;
            }

            let Some(asset) = resolve_asset_and_cache(item_id, &assets, include_color) else {
                continue;
            };

            let _ = CatalogAssetLoadedEvent::from_asset(item_id, &asset).emit(&app);
        }
    });
}

// MARK: - Catalog Assets

pub struct CatalogAssets {
    assets: HashMap<CatalogAssetKey, CatalogAsset>,
}

impl CatalogAssets {
    pub fn new() -> Self {
        return Self {
            assets: HashMap::new(),
        };
    }

    pub fn get(&self, item_id: &CatalogItemId) -> Option<&CatalogAsset> {
        return self.assets.get(&CatalogAssetKey::from(item_id));
    }

    pub fn has(&self, item_id: &CatalogItemId) -> bool {
        return self.assets.contains_key(&CatalogAssetKey::from(item_id));
    }

    pub fn set(&mut self, item_id: &CatalogItemId, asset: CatalogAsset) {
        self.assets.insert(CatalogAssetKey::from(item_id), asset);
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
enum CatalogAssetKey {
    App(String),
    Website(String),
}

impl From<&CatalogItemId> for CatalogAssetKey {
    fn from(item_id: &CatalogItemId) -> Self {
        return match item_id {
            CatalogItemId::App { stable_id, .. } => Self::App(stable_id.clone()),
            CatalogItemId::Website { hostname } => Self::Website(hostname.clone()),
        };
    }
}

#[derive(Debug, Clone)]
pub struct CatalogAsset {
    pub icon: Option<String>,
    pub color: Option<String>,
}

// MARK: - Resolvers

pub(super) fn resolve_asset_and_cache(
    item_id: &CatalogItemId,
    assets: &Arc<Mutex<CatalogAssets>>,
    include_color: bool,
) -> Option<CatalogAsset> {
    if let Ok(locked) = assets.lock() {
        if let Some(cached) = locked.get(item_id) {
            return Some(cached.clone());
        }
    }

    let asset = resolve_asset(item_id, include_color)?;

    // Note: Check cache again because another thread may have inserted while resolve ran without the lock
    if let Ok(mut locked) = assets.lock() {
        if !locked.has(item_id) {
            locked.set(item_id, asset.clone());
        }
    }

    return Some(asset);
}

fn resolve_asset(item_id: &CatalogItemId, include_color: bool) -> Option<CatalogAsset> {
    return match item_id {
        CatalogItemId::App { bundle_id, .. } => {
            let bundle_id = bundle_id.as_deref()?;
            resolve_app_asset(bundle_id, include_color)
        }
        CatalogItemId::Website { hostname } => resolve_website_asset(hostname),
    };
}

#[cfg(target_os = "macos")]
fn resolve_app_asset(bundle_id: &str, include_color: bool) -> Option<CatalogAsset> {
    let icon_data = get_app_icon(bundle_id, 64, include_color);
    if icon_data.data_url.is_none() {
        return None;
    }

    return Some(CatalogAsset {
        icon: icon_data.data_url,
        color: icon_data.color,
    });
}

#[cfg(not(target_os = "macos"))]
fn resolve_app_asset(_bundle_id: &str, _include_color: bool) -> Option<CatalogAsset> {
    return None;
}

fn resolve_website_asset(hostname: &str) -> Option<CatalogAsset> {
    return Some(CatalogAsset {
        icon: Some(format!(
            "https://www.google.com/s2/favicons?domain={hostname}&sz=64"
        )),
        color: None,
    });
}
