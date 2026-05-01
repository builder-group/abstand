use std::collections::HashMap;

#[derive(Debug, Default)]
pub struct CatalogAssets {
    assets: HashMap<CatalogAssetKey, CatalogAssetData>,
}

impl CatalogAssets {
    pub fn new() -> Self {
        return Self::default();
    }

    pub fn get_for_app(&self, app_id: &str) -> Option<&CatalogAssetData> {
        let key = CatalogAssetKey::App(app_id.to_string());
        return self.assets.get(&key);
    }

    pub fn get_for_website(&self, domain: &str) -> Option<&CatalogAssetData> {
        let key = CatalogAssetKey::Website(domain.to_string());
        return self.assets.get(&key);
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
