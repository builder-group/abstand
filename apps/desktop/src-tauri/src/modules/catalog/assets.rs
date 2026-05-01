use super::search::CatalogSearchResult;
use std::collections::HashMap;

#[derive(Debug, Default)]
pub struct CatalogAssets {
    assets: HashMap<CatalogAssetKey, CatalogAssetData>,
}

impl CatalogAssets {
    pub fn new() -> Self {
        return Self::default();
    }

    pub fn get(&self, request: &CatalogAssetRequest) -> Option<&CatalogAssetData> {
        return self.assets.get(&request.key());
    }

    pub fn has(&self, request: &CatalogAssetRequest) -> bool {
        return self.assets.contains_key(&request.key());
    }

    pub fn set(&mut self, request: &CatalogAssetRequest, asset: CatalogAssetData) {
        self.assets.insert(request.key(), asset);
    }
}

#[derive(Debug, Clone)]
pub enum CatalogAssetRequest {
    App {
        app_id: String,
        bundle_id: Option<String>,
    },
    Website {
        domain: String,
    },
}

impl CatalogAssetRequest {
    pub fn key(&self) -> CatalogAssetKey {
        return match self {
            Self::App { app_id, .. } => CatalogAssetKey::App(app_id.clone()),
            Self::Website { domain } => CatalogAssetKey::Website(domain.clone()),
        };
    }
}

impl From<&CatalogSearchResult> for CatalogAssetRequest {
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

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum CatalogAssetKey {
    App(String),
    Website(String),
}

#[derive(Debug, Clone, Default)]
pub struct CatalogAssetData {
    pub icon: Option<String>,
    pub color: Option<String>,
}
