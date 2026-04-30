use super::types::{CatalogSearchResultDto, CatalogSearchState};
use serde::Deserialize;
use tauri::State;

/// Searches cached catalog items by query.
#[tauri::command]
#[specta::specta]
pub async fn search_catalog(
    state: State<'_, CatalogSearchState>,
    params: SearchCatalogParams,
) -> Result<Vec<CatalogSearchResultDto>, String> {
    let query = params.query.trim().to_string();
    if query.is_empty() {
        return Ok(Vec::new());
    }
    let limit = params.limit.unwrap_or(20) as usize;
    let search = state.arc();

    return tauri::async_runtime::spawn_blocking(move || {
        let mut locked = search
            .lock()
            .map_err(|_| "Catalog search state is unavailable".to_string())?;
        Ok(locked.search(&query, limit))
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
