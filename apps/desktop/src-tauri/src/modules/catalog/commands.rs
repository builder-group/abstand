use super::{
    assets::{resolve_result_assets_await, resolve_result_assets_lazy},
    types::{
        CatalogAssetsState, CatalogIconMode, CatalogSearchResponseDto, CatalogSearchResultDto,
        CatalogSearchState,
    },
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
) -> Result<CatalogSearchResponseDto, String> {
    let query = params.query.trim().to_string();
    let limit = params.limit.unwrap_or(20) as usize;
    let icon_mode = params.icon_mode.unwrap_or_default();
    let search = state.arc();
    let assets = assets.inner().clone();

    if query.is_empty() {
        return Ok(CatalogSearchResponseDto {
            results: Vec::new(),
            lazy_session_id: None,
        });
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

    let lazy_session_id = match icon_mode {
        CatalogIconMode::None => None,
        CatalogIconMode::Await => {
            let mut locked = assets
                .lock()
                .map_err(|_| "Catalog asset state is unavailable".to_string())?;
            resolve_result_assets_await(&mut results, &mut locked)?;
            None
        }
        CatalogIconMode::Lazy => {
            let session_id = assets
                .lock()
                .map_err(|_| "Catalog asset state is unavailable".to_string())?
                .create_session();
            resolve_result_assets_lazy(app, assets, session_id, &results);
            Some(session_id)
        }
    };

    return Ok(CatalogSearchResponseDto {
        results,
        lazy_session_id,
    });
}

/// Cancels an active lazy catalog asset session.
#[tauri::command]
#[specta::specta]
pub fn cancel_catalog_search_session(
    assets: State<'_, CatalogAssetsState>,
    params: CancelCatalogSearchSessionParams,
) {
    if let Ok(mut locked) = assets.lock() {
        locked.cancel_session(params.session_id);
    }
}

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SearchCatalogParams {
    pub query: String,
    pub limit: Option<u32>,
    pub icon_mode: Option<CatalogIconMode>,
}

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CancelCatalogSearchSessionParams {
    pub session_id: u64,
}
