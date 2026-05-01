use super::{
    assets::{load_assets, CatalogAssets},
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

            let locked_assets = assets
                .lock()
                .map_err(|_| "Catalog assets state is unavailable".to_string())?;

            return Ok(results
                .iter()
                .map(|result| CatalogSearchResultDto::from_search_result(result, &locked_assets))
                .collect());
        },
    )
    .await
    .map_err(|e| e.to_string())??;

    load_assets(
        app,
        assets_state.inner().clone(),
        dtos.iter().map(CatalogItemId::from).collect(),
    );

    return Ok(dtos);
}

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SearchCatalogParams {
    pub query: String,
    pub limit: Option<u32>,
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
    fn from_search_result(result: &CatalogSearchResult, assets: &CatalogAssets) -> Self {
        let asset = assets.get(&CatalogItemId::from(result));

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
