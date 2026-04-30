use super::{
    assets::{resolve_result_assets_await, resolve_result_assets_lazy},
    types::{CatalogAssetsState, CatalogIconMode, CatalogSearchResultDto, CatalogSearchState},
};
use serde::Deserialize;
use tauri::{AppHandle, State};

/// Searches cached catalog items by query.
#[tauri::command]
#[specta::specta]
pub async fn search_catalog(
    app: AppHandle,
    assets: State<'_, CatalogAssetsState>,
    state: State<'_, CatalogSearchState>,
    params: SearchCatalogParams,
) -> Result<Vec<CatalogSearchResultDto>, String> {
    let query = params.query.trim().to_string();
    let limit = params.limit.unwrap_or(20) as usize;
    let icon_mode = params.icon_mode.unwrap_or_default();
    let search = state.arc();
    let assets = assets.inner().clone();
    let session_id = assets.advance_session();

    if query.is_empty() {
        return Ok(Vec::new());
    }

    let mut results = tauri::async_runtime::spawn_blocking(
        move || -> Result<Vec<CatalogSearchResultDto>, String> {
            let locked = search
                .lock()
                .map_err(|_| "Catalog search state is unavailable".to_string())?;
            Ok(locked.search(&query, limit))
        },
    )
    .await
    .map_err(|e| e.to_string())??;

    match icon_mode {
        CatalogIconMode::None => {}
        CatalogIconMode::Await => {
            resolve_result_assets_await(&mut results, &assets)?;
        }
        CatalogIconMode::Lazy => {
            resolve_result_assets_lazy(app, assets, session_id, &results);
        }
    }

    return Ok(results);
}

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SearchCatalogParams {
    pub query: String,
    pub limit: Option<u32>,
    pub icon_mode: Option<CatalogIconMode>,
}
