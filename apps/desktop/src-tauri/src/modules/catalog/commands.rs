use super::{
    assets::{load_assets, resolve_asset, CatalogAsset},
    search::CatalogSearchResult,
    types::{CatalogAssetsState, CatalogItemId, CatalogSearchState},
};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

/// Searches cached catalog items by query.
#[tauri::command]
#[specta::specta]
pub async fn search_catalog(
    app: AppHandle,
    search_state: State<'_, CatalogSearchState>,
    assets_state: State<'_, CatalogAssetsState>,
    params: SearchCatalogParams,
) -> Result<Vec<CatalogSearchResultDto>, String> {
    let query = params.query.trim().to_string();
    if query.is_empty() {
        return Ok(Vec::new());
    }
    let limit = params.limit.unwrap_or(20) as usize;
    let icon_mode = params.include_icon.unwrap_or(CatalogIconMode::Lazy {
        include_color: false,
    });
    let include_color = match &icon_mode {
        CatalogIconMode::Eager { include_color } | CatalogIconMode::Lazy { include_color } => {
            *include_color
        }
        CatalogIconMode::Skip => false,
    };
    let is_lazy = matches!(icon_mode, CatalogIconMode::Lazy { .. });

    let search = search_state.arc();
    let assets = assets_state.arc();

    let dtos = tauri::async_runtime::spawn_blocking(
        move || -> Result<Vec<CatalogSearchResultDto>, String> {
            let results = {
                let locked = search
                    .lock()
                    .map_err(|_| "Catalog search state is unavailable".to_string())?;
                locked.search(&query, limit)
            };

            let dtos = match icon_mode {
                CatalogIconMode::Skip => results
                    .iter()
                    .map(|result| CatalogSearchResultDto::from_search_result(result, None))
                    .collect(),
                CatalogIconMode::Eager { .. } => results
                    .iter()
                    .map(|result| {
                        let item_id = CatalogItemId::from(result);
                        let asset = resolve_asset(&item_id, include_color);
                        CatalogSearchResultDto::from_search_result(result, asset.as_ref())
                    })
                    .collect(),
                CatalogIconMode::Lazy { .. } => {
                    let locked_assets = assets
                        .lock()
                        .map_err(|_| "Catalog assets state is unavailable".to_string())?;
                    results
                        .iter()
                        .map(|result| {
                            let item_id = CatalogItemId::from(result);
                            let asset = locked_assets.get(&item_id);
                            CatalogSearchResultDto::from_search_result(result, asset)
                        })
                        .collect()
                }
            };

            return Ok(dtos);
        },
    )
    .await
    .map_err(|e| e.to_string())??;

    if is_lazy {
        load_assets(
            app,
            assets_state.inner().clone(),
            dtos.iter().map(CatalogItemId::from).collect(),
            include_color,
        );
    }

    return Ok(dtos);
}

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SearchCatalogParams {
    pub query: String,
    pub limit: Option<u32>,
    pub include_icon: Option<CatalogIconMode>,
}

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum CatalogIconMode {
    Skip,
    Eager { include_color: bool },
    Lazy { include_color: bool },
}

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
    pub app_id: String,
    pub bundle_id: Option<String>,
    pub name: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CatalogWebsiteSearchResultDto {
    pub domain: String,
    pub name: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
}

impl CatalogSearchResultDto {
    fn from_search_result(result: &CatalogSearchResult, asset: Option<&CatalogAsset>) -> Self {
        return match result {
            CatalogSearchResult::App { app, score } => Self::App {
                app: CatalogAppSearchResultDto {
                    app_id: app.app_id.clone(),
                    bundle_id: app.bundle_id.clone(),
                    name: app.name.clone(),
                    icon: asset.and_then(|a| a.icon.clone()),
                    color: asset.and_then(|a| a.color.clone()),
                },
                score: *score,
            },
            CatalogSearchResult::Website { website, score } => Self::Website {
                website: CatalogWebsiteSearchResultDto {
                    domain: website.domain.clone(),
                    name: website.name.clone(),
                    icon: asset.and_then(|a| a.icon.clone()),
                    color: asset.and_then(|a| a.color.clone()),
                },
                score: *score,
            },
        };
    }
}

impl From<&CatalogSearchResult> for CatalogItemId {
    fn from(result: &CatalogSearchResult) -> Self {
        return match result {
            CatalogSearchResult::App { app, .. } => Self::App {
                app_id: app.app_id.clone(),
                bundle_id: app.bundle_id.clone(),
            },
            CatalogSearchResult::Website { website, .. } => Self::Website {
                domain: website.domain.clone(),
            },
        };
    }
}

impl From<&CatalogSearchResultDto> for CatalogItemId {
    fn from(dto: &CatalogSearchResultDto) -> Self {
        return match dto {
            CatalogSearchResultDto::App { app, .. } => Self::App {
                app_id: app.app_id.clone(),
                bundle_id: app.bundle_id.clone(),
            },
            CatalogSearchResultDto::Website { website, .. } => Self::Website {
                domain: website.domain.clone(),
            },
        };
    }
}
