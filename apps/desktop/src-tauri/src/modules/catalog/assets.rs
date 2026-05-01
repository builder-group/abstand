use crate::modules::catalog::types::{CatalogAssetLoadedEvent, CatalogAssetsState, CatalogItemId};
#[cfg(target_os = "macos")]
use mado::get_app_icon;
use std::collections::{HashMap, HashSet};
use std::sync::atomic::Ordering;
use tauri::AppHandle;
use tauri_specta::Event;

pub fn load_assets(app: AppHandle, assets_state: CatalogAssetsState, item_ids: Vec<CatalogItemId>) {
    if item_ids.is_empty() {
        return;
    }

    // Each call gets a new generation so the spawned thread can detect when a newer
    // search has started and stop early. See: https://github.com/orgs/tauri-apps/discussions/5894
    let generation = assets_state.next_generation();
    let generation_state = assets_state.generation_arc();
    let assets = assets_state.arc();

    tauri::async_runtime::spawn_blocking(move || {
        let mut seen_keys = HashSet::<CatalogAssetKey>::new();

        for item_id in &item_ids {
            if generation_state.load(Ordering::SeqCst) != generation {
                break;
            }

            if !seen_keys.insert(item_id.key()) {
                continue;
            }

            let is_cached = match assets.lock() {
                Ok(locked) => locked.has(item_id),
                Err(_) => break,
            };
            if is_cached {
                continue;
            }

            let Some(asset) = resolve_asset(item_id) else {
                continue;
            };

            // Check again after the blocking resolve; a newer search may have started.
            if generation_state.load(Ordering::SeqCst) != generation {
                break;
            }

            match assets.lock() {
                Ok(mut locked) => {
                    // Another thread may have inserted while resolve ran without the lock.
                    if !locked.has(item_id) {
                        locked.set(item_id, asset.clone());
                        let _ = CatalogAssetLoadedEvent::from_asset(item_id, &asset).emit(&app);
                    }
                }
                Err(_) => break,
            }
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
        return self.assets.get(&item_id.key());
    }

    pub fn has(&self, item_id: &CatalogItemId) -> bool {
        return self.assets.contains_key(&item_id.key());
    }

    pub fn set(&mut self, item_id: &CatalogItemId, asset: CatalogAsset) {
        self.assets.insert(item_id.key(), asset);
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
enum CatalogAssetKey {
    App(String),
    Website(String),
}

impl CatalogItemId {
    fn key(&self) -> CatalogAssetKey {
        return match self {
            Self::App { app_id, .. } => CatalogAssetKey::App(app_id.clone()),
            Self::Website { domain } => CatalogAssetKey::Website(domain.clone()),
        };
    }
}

#[derive(Debug, Clone, Default)]
pub struct CatalogAsset {
    pub icon: Option<String>,
    pub color: Option<String>,
}

// MARK: - Resolvers

fn resolve_asset(item_id: &CatalogItemId) -> Option<CatalogAsset> {
    return match item_id {
        CatalogItemId::App { bundle_id, .. } => {
            let bundle_id = bundle_id.as_deref()?;
            resolve_app_asset(bundle_id)
        }
        CatalogItemId::Website { domain } => resolve_website_asset(domain),
    };
}

#[cfg(target_os = "macos")]
fn resolve_app_asset(bundle_id: &str) -> Option<CatalogAsset> {
    let icon_data = get_app_icon(bundle_id, 64, false);
    if icon_data.data_url.is_none() {
        return None;
    }

    return Some(CatalogAsset {
        icon: icon_data.data_url,
        color: None,
    });
}

#[cfg(not(target_os = "macos"))]
fn resolve_app_asset(_bundle_id: &str) -> Option<CatalogAsset> {
    return None;
}

fn resolve_website_asset(domain: &str) -> Option<CatalogAsset> {
    return Some(CatalogAsset {
        icon: Some(format!(
            "https://www.google.com/s2/favicons?domain={domain}&sz=64"
        )),
        color: None,
    });
}
