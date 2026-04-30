use super::types::{
    CatalogAppSearchResultDto, CatalogAssetsState, CatalogIconDto, CatalogIconLoadedEvent,
    CatalogSearchResultDto, CatalogWebsiteSearchResultDto,
};
#[cfg(target_os = "macos")]
use mado::get_app_icon;
use tauri::AppHandle;
use tauri_specta::Event;

/// Applies resolved icon assets to all results before the search response is returned.
pub fn resolve_result_assets_await(
    results: &mut [CatalogSearchResultDto],
    assets: &CatalogAssetsState,
) -> Result<(), String> {
    for result in results.iter_mut() {
        let asset = resolve_result_asset(result, assets)?;
        apply_result_asset(result, asset);
    }

    return Ok(());
}

/// Resolves icon assets incrementally and emits them for the active lazy session.
///
/// Cancellation is cooperative. A newer session stops further work between results, but an
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
            if !assets.is_session_current(session_id) {
                break;
            }

            let assets_for_task = assets.clone();
            let target_for_task = target.clone();
            let asset = match tauri::async_runtime::spawn_blocking(move || {
                resolve_target_asset(&target_for_task, &assets_for_task)
            })
            .await
            {
                Ok(Ok(asset)) => asset,
                Ok(Err(_)) | Err(_) => continue,
            };

            if !assets.is_session_current(session_id) {
                break;
            }

            let _ = CatalogIconLoadedEvent {
                target_key: target.target_key,
                asset,
            }
            .emit(&app);
        }
    });
}

/// Resolves the icon asset for one catalog result, using the shared cache when possible.
pub fn resolve_result_asset(
    result: &CatalogSearchResultDto,
    assets: &CatalogAssetsState,
) -> Result<CatalogIconDto, String> {
    return resolve_target_asset(&CatalogAssetTarget::from(result), assets);
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

fn resolve_target_asset(
    target: &CatalogAssetTarget,
    assets: &CatalogAssetsState,
) -> Result<CatalogIconDto, String> {
    if let Some(cached_icon) = assets.cached_icon(&target.target_key)? {
        return Ok(cached_icon);
    }

    let asset = match target.kind {
        CatalogAssetTargetKind::App { ref app } => resolve_app_asset(app),
        CatalogAssetTargetKind::Website { ref website } => resolve_website_asset(website),
    };

    assets.cache_icon(target.target_key.clone(), asset.clone())?;
    return Ok(asset);
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
        let assets = CatalogAssetsState::init();
        let mut results = vec![website_result("example.com")];

        resolve_result_assets_await(&mut results, &assets).unwrap();

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
}
