use super::{
    search::CatalogSearchResult,
    types::{CatalogAssetsState, CatalogSearchState},
};
use serde::{Deserialize, Serialize};
use tauri::State;

/// Searches cached catalog items by query.
#[tauri::command]
#[specta::specta]
pub async fn search_catalog(
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

    return tauri::async_runtime::spawn_blocking(move || {
        let results = {
            let locked = search
                .lock()
                .map_err(|_| "Catalog search state is unavailable".to_string())?;
            locked.search(&query, limit)
        };

        let locked_assets = assets
            .lock()
            .map_err(|_| "Catalog assets state is unavailable".to_string())?;
        let results = results
            .into_iter()
            .map(|result| CatalogSearchResultDto::from_search_result(result, &locked_assets))
            .collect();

        return Ok(results);
    })
    .await
    .map_err(|e| e.to_string())?;
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
    fn from_search_result(
        result: CatalogSearchResult,
        assets: &super::assets::CatalogAssets,
    ) -> Self {
        return match result {
            CatalogSearchResult::App { app, score } => {
                let asset = assets.get_for_app(&app.app_id);
                Self::App {
                    app: CatalogAppSearchResultDto {
                        app_id: app.app_id,
                        bundle_id: app.bundle_id,
                        name: app.name,
                        icon: asset.and_then(|asset| asset.icon.clone()),
                        color: asset.and_then(|asset| asset.color.clone()),
                    },
                    score,
                }
            }
            CatalogSearchResult::Website { website, score } => {
                let asset = assets.get_for_website(&website.domain);
                Self::Website {
                    website: CatalogWebsiteSearchResultDto {
                        domain: website.domain,
                        name: website.name,
                        icon: asset.and_then(|asset| asset.icon.clone()),
                        color: asset.and_then(|asset| asset.color.clone()),
                    },
                    score,
                }
            }
        };
    }
}
