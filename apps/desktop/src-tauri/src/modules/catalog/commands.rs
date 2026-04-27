use super::types::CatalogSearchResult;
use serde::Deserialize;

#[tauri::command]
#[specta::specta]
pub fn search_catalog(params: SearchCatalogParams) -> Result<Vec<CatalogSearchResult>, String> {
    let _ = params.query;
    return Ok(Vec::new());
}

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SearchCatalogParams {
    pub query: String,
}
