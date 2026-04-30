use super::types::{
    CatalogAppSearchResultDto, CatalogAssetsState, CatalogIconDto, CatalogIconLoadedEvent,
    CatalogSearchResultDto, CatalogWebsiteSearchResultDto,
};
#[cfg(target_os = "macos")]
use mado::get_app_icon;
use std::collections::HashMap;
use tauri::AppHandle;
use tauri_specta::Event;

pub struct CatalogAssets {
    cache: HashMap<String, CatalogIconDto>,
    next_session_id: u64,
    sessions: HashMap<u64, CatalogAssetSessionStatus>,
}

impl CatalogAssets {
    pub fn new() -> Self {
        return Self {
            cache: HashMap::new(),
            next_session_id: 0,
            sessions: HashMap::new(),
        };
    }

    /// Creates a new lazy catalog asset session and returns its identifier.
    pub fn create_session(&mut self) -> u64 {
        self.next_session_id += 1;
        self.sessions
            .insert(self.next_session_id, CatalogAssetSessionStatus::Active);
        return self.next_session_id;
    }

    /// Returns whether the session is still allowed to continue resolving assets.
    pub fn is_session_active(&self, session_id: u64) -> bool {
        return matches!(
            self.sessions.get(&session_id),
            Some(CatalogAssetSessionStatus::Active)
        );
    }

    /// Cancels a lazy catalog asset session.
    pub fn cancel_session(&mut self, session_id: u64) {
        if let Some(status) = self.sessions.get_mut(&session_id) {
            *status = CatalogAssetSessionStatus::Cancelled;
        }
    }

    /// Removes session bookkeeping once lazy asset resolution has finished.
    pub fn finish_session(&mut self, session_id: u64) {
        self.sessions.remove(&session_id);
    }

    /// Resolves the icon asset for one catalog result, using the shared cache when possible.
    pub fn resolve_result_asset(
        &mut self,
        result: &CatalogSearchResultDto,
    ) -> Result<CatalogIconDto, String> {
        return self.resolve_target_asset(&CatalogAssetTarget::from(result));
    }

    fn cached_icon(&self, target_key: &str) -> Option<CatalogIconDto> {
        return self.cache.get(target_key).cloned();
    }

    fn cache_icon(&mut self, target_key: String, icon: CatalogIconDto) {
        self.cache.insert(target_key, icon);
    }

    fn resolve_target_asset(
        &mut self,
        target: &CatalogAssetTarget,
    ) -> Result<CatalogIconDto, String> {
        if let Some(cached_icon) = self.cached_icon(&target.target_key) {
            return Ok(cached_icon);
        }

        let asset = match target.kind {
            CatalogAssetTargetKind::App { ref app } => resolve_app_asset(app),
            CatalogAssetTargetKind::Website { ref website } => resolve_website_asset(website),
        };

        self.cache_icon(target.target_key.clone(), asset.clone());
        return Ok(asset);
    }
}

/// Applies resolved icon assets to all results before the search response is returned.
pub fn resolve_result_assets_await(
    results: &mut [CatalogSearchResultDto],
    assets: &mut CatalogAssets,
) -> Result<(), String> {
    for result in results.iter_mut() {
        let asset = assets.resolve_result_asset(result)?;
        apply_result_asset(result, asset);
    }

    return Ok(());
}

/// Resolves icon assets incrementally and emits them for a lazy catalog search session.
///
/// Cancellation is cooperative. A canceled session stops further work between results, but an
/// icon extraction already running on the blocking pool is allowed to finish.
pub fn resolve_result_assets_lazy(
    app: AppHandle,
    assets: CatalogAssetsState,
    session_id: u64,
    results: &[CatalogSearchResultDto],
) {
    let targets = results
        .iter()
        .map(CatalogAssetTarget::from)
        .collect::<Vec<_>>();

    tauri::async_runtime::spawn(async move {
        for target in targets {
            let is_session_active = assets
                .lock()
                .map(|locked| locked.is_session_active(session_id))
                .unwrap_or(false);
            if !is_session_active {
                break;
            }

            let assets_for_task = assets.arc();
            let target_for_task = target.clone();
            let asset = match tauri::async_runtime::spawn_blocking(move || {
                let mut locked = assets_for_task
                    .lock()
                    .map_err(|_| "Catalog asset state is unavailable".to_string())?;
                locked.resolve_target_asset(&target_for_task)
            })
            .await
            {
                Ok(Ok(asset)) => asset,
                Ok(Err(_)) | Err(_) => continue,
            };

            let is_session_active = assets
                .lock()
                .map(|locked| locked.is_session_active(session_id))
                .unwrap_or(false);
            if !is_session_active {
                break;
            }

            let _ = CatalogIconLoadedEvent {
                target_key: target.target_key,
                asset,
            }
            .emit(&app);
        }

        if let Ok(mut locked) = assets.lock() {
            locked.finish_session(session_id);
        }
    });
}

pub fn apply_result_asset(result: &mut CatalogSearchResultDto, asset: CatalogIconDto) {
    match result {
        CatalogSearchResultDto::App { app, .. } => {
            app.icon = asset.icon;
            app.color = asset.color;
        }
        CatalogSearchResultDto::Website { website, .. } => {
            website.icon = asset.icon;
            website.color = asset.color;
        }
    }
}

fn resolve_app_asset(app: &CatalogAppSearchResultDto) -> CatalogIconDto {
    if app.icon.is_some() || app.color.is_some() {
        return CatalogIconDto {
            icon: app.icon.clone(),
            color: app.color.clone(),
        };
    }

    #[cfg(target_os = "macos")]
    {
        let Some(bundle_id) = app.bundle_id.as_deref() else {
            return CatalogIconDto {
                icon: None,
                color: None,
            };
        };

        let icon_data = get_app_icon(bundle_id, 64);
        return CatalogIconDto {
            icon: icon_data.data_url,
            color: icon_data.color,
        };
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = app;
        return CatalogIconDto {
            icon: None,
            color: None,
        };
    }
}

fn resolve_website_asset(website: &CatalogWebsiteSearchResultDto) -> CatalogIconDto {
    if website.icon.is_some() || website.color.is_some() {
        return CatalogIconDto {
            icon: website.icon.clone(),
            color: website.color.clone(),
        };
    }

    return CatalogIconDto {
        icon: Some(format!(
            "https://www.google.com/s2/favicons?domain={}&sz=64",
            website.domain
        )),
        color: None,
    };
}

#[derive(Debug, Clone)]
struct CatalogAssetTarget {
    target_key: String,
    kind: CatalogAssetTargetKind,
}

#[derive(Debug, Clone)]
enum CatalogAssetTargetKind {
    App {
        app: CatalogAppSearchResultDto,
    },
    Website {
        website: CatalogWebsiteSearchResultDto,
    },
}

impl From<&CatalogSearchResultDto> for CatalogAssetTarget {
    fn from(result: &CatalogSearchResultDto) -> Self {
        return match result {
            CatalogSearchResultDto::App { app, .. } => Self {
                target_key: format!("app:{}", app.app_id),
                kind: CatalogAssetTargetKind::App { app: app.clone() },
            },
            CatalogSearchResultDto::Website { website, .. } => Self {
                target_key: format!("website:{}", website.domain),
                kind: CatalogAssetTargetKind::Website {
                    website: website.clone(),
                },
            },
        };
    }
}

#[derive(Debug, Clone, Copy)]
enum CatalogAssetSessionStatus {
    Active,
    Cancelled,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn website_result(domain: &str) -> CatalogSearchResultDto {
        return CatalogSearchResultDto::Website {
            website: CatalogWebsiteSearchResultDto {
                domain: domain.to_string(),
                name: Some(domain.to_string()),
                icon: None,
                color: None,
            },
            score: 100,
        };
    }

    #[test]
    fn resolve_result_assets_await_populates_website_assets() {
        let mut assets = CatalogAssets::new();
        let mut results = vec![website_result("example.com")];

        resolve_result_assets_await(&mut results, &mut assets).unwrap();

        match &results[0] {
            CatalogSearchResultDto::Website { website, .. } => {
                assert_eq!(
                    website.icon.as_deref(),
                    Some("https://www.google.com/s2/favicons?domain=example.com&sz=64")
                );
            }
            _ => panic!("Expected website result"),
        }
    }

    #[test]
    fn result_target_key_formats_stable_catalog_keys() {
        assert_eq!(
            CatalogAssetTarget::from(&website_result("example.com")).target_key,
            "website:example.com"
        );
    }

    #[test]
    fn cancel_session_only_invalidates_the_active_session() {
        let mut assets = CatalogAssets::new();
        let first = assets.create_session();
        let second = assets.create_session();

        assets.cancel_session(first);
        assert!(!assets.is_session_active(first));
        assert!(assets.is_session_active(second));

        assets.cancel_session(second);
        assert!(!assets.is_session_active(second));
    }

    #[test]
    fn cancel_session_after_finish_does_not_recreate_session_state() {
        let mut assets = CatalogAssets::new();
        let session_id = assets.create_session();

        assets.finish_session(session_id);
        assets.cancel_session(session_id);

        assert!(!assets.is_session_active(session_id));
    }
}
