use super::{
    app_id::resolve_app_identity,
    matcher::fuzzy_match,
    predefined::PREDEFINED_SERVICES,
    types::{CatalogAppSearchResultDto, CatalogSearchResultDto, CatalogWebsiteSearchResultDto},
};
use crate::common::url::extract_domain;
use mado::{get_installed_apps, InstalledAppsConfig};
use std::collections::HashSet;

pub struct CatalogSearch {
    apps: Vec<SearchableItem>,
    websites: Vec<SearchableItem>,
}

impl CatalogSearch {
    pub fn new() -> Self {
        return Self {
            apps: Self::load_apps(),
            websites: Self::load_websites(),
        };
    }

    /// Searches cached catalog items by query.
    pub fn search(&self, query: &str, limit: usize) -> Vec<CatalogSearchResultDto> {
        let trimmed_query = query.trim();
        if trimmed_query.is_empty() {
            return Vec::new();
        }

        // Normalize URL-like input so `https://docs.example.com/page` matches on the host
        let (match_query, custom_domain) = match extract_domain(trimmed_query) {
            Some(domain) => {
                let custom_domain = (!self.has_website_domain(&domain))
                    .then(|| SearchableItem::custom_domain(domain.clone()));
                (domain, custom_domain)
            }
            None => (trimmed_query.to_string(), None),
        };

        let items = self
            .apps
            .iter()
            .chain(self.websites.iter())
            .chain(custom_domain.iter());
        let matches = fuzzy_match(items, &match_query);

        let mut seen_ids = HashSet::<String>::new();
        return matches
            .into_iter()
            // Keep only the best result for each stable identifier
            .filter(|(item, _)| seen_ids.insert(item.id().to_string()))
            .take(limit)
            .map(|(item, score)| CatalogSearchResultDto::from(((*item).clone(), score)))
            .collect();
    }

    /// Loads searchable app items from installed native apps.
    fn load_apps() -> Vec<SearchableItem> {
        let config = InstalledAppsConfig {
            include_icon: false,
            icon_size: 0,
        };

        return get_installed_apps(config)
            .into_iter()
            .map(|app| {
                let identity = resolve_app_identity(&app.bundle_id, &app.name, &app.path);
                SearchableItem::app(identity.app_id, identity.bundle_id, Some(app.name))
            })
            .collect();
    }

    /// Loads searchable website items from predefined services.
    fn load_websites() -> Vec<SearchableItem> {
        let mut items = Vec::new();

        for service in PREDEFINED_SERVICES {
            let mut keywords = Vec::with_capacity(
                service.domains.len() + service.aliases.len() + service.bundle_ids.len(),
            );
            keywords.extend(service.domains.iter().map(|domain| (*domain).to_string()));
            keywords.extend(service.aliases.iter().map(|alias| (*alias).to_string()));

            // Note: Keep the bundle IDs on the service model for future grouping work,
            // but do not feed them into website matching yet
            for domain in service.domains {
                items.push(SearchableItem::website(
                    (*domain).to_string(),
                    Some(service.name.to_string()),
                    keywords.clone(),
                ));
            }
        }

        return items;
    }

    fn has_website_domain(&self, domain: &str) -> bool {
        return self.websites.iter().any(|item| item.id() == domain);
    }

    #[cfg(test)]
    fn from_items(apps: Vec<SearchableItem>, websites: Vec<SearchableItem>) -> Self {
        return Self { apps, websites };
    }
}

// MARK: - Searchable Item

#[derive(Debug, Clone)]
pub enum SearchableItem {
    App {
        app: CatalogAppSearchResultDto,
        keywords: Vec<String>,
    },
    Website {
        website: CatalogWebsiteSearchResultDto,
        keywords: Vec<String>,
    },
}

impl SearchableItem {
    pub fn app(app_id: String, bundle_id: Option<String>, name: Option<String>) -> Self {
        let mut keywords = vec![app_id.clone()];
        if let Some(bundle_id) = bundle_id.as_ref() {
            keywords.push(bundle_id.clone());
        }

        return Self::App {
            keywords,
            app: CatalogAppSearchResultDto {
                app_id,
                bundle_id,
                name,
                icon: None,
                color: None,
            },
        };
    }

    pub fn website(domain: String, name: Option<String>, keywords: Vec<String>) -> Self {
        return Self::Website {
            website: CatalogWebsiteSearchResultDto {
                domain,
                name,
                icon: None,
                color: None,
            },
            keywords,
        };
    }

    pub fn custom_domain(domain: String) -> Self {
        return Self::website(domain.clone(), Some(domain.clone()), vec![domain]);
    }

    pub fn id(&self) -> &str {
        return match self {
            Self::App { app, .. } => &app.app_id,
            Self::Website { website, .. } => &website.domain,
        };
    }

    pub fn name(&self) -> &str {
        return match self {
            Self::App { app, .. } => app
                .name
                .as_deref()
                .or(app.bundle_id.as_deref())
                .unwrap_or(&app.app_id),
            Self::Website { website, .. } => website.name.as_deref().unwrap_or(&website.domain),
        };
    }

    pub fn keywords(&self) -> &[String] {
        return match self {
            Self::App { keywords, .. } => keywords,
            Self::Website { keywords, .. } => keywords,
        };
    }
}

impl From<(SearchableItem, u32)> for CatalogSearchResultDto {
    fn from((item, score): (SearchableItem, u32)) -> Self {
        return match item {
            SearchableItem::App { app, .. } => Self::App { app, score },
            SearchableItem::Website { website, .. } => Self::Website { website, score },
        };
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::modules::catalog::types::CatalogSearchResultDto;

    fn app(name: &str, bundle_id: &str) -> SearchableItem {
        return SearchableItem::app(
            bundle_id.to_string(),
            Some(bundle_id.to_string()),
            Some(name.to_string()),
        );
    }

    fn website(name: &str, domain: &str) -> SearchableItem {
        return SearchableItem::website(
            domain.to_string(),
            Some(name.to_string()),
            vec![domain.to_string()],
        );
    }

    #[test]
    fn returns_predefined_websites() {
        let search = CatalogSearch::from_items(Vec::new(), vec![website("Notion", "notion.so")]);

        let results = search.search("notion", 12);

        match &results[0] {
            CatalogSearchResultDto::Website { website, .. } => {
                assert_eq!(website.domain, "notion.so");
                assert_eq!(website.name.as_deref(), Some("Notion"));
                assert_eq!(website.icon, None);
            }
            _ => panic!("Expected website result"),
        }
    }

    #[test]
    fn converts_apps_to_search_results() {
        let search =
            CatalogSearch::from_items(vec![app("Cursor", "com.todesktop.cursor")], Vec::new());

        let results = search.search("cursor", 12);

        match &results[0] {
            CatalogSearchResultDto::App { app, .. } => {
                assert_eq!(app.app_id, "com.todesktop.cursor");
                assert_eq!(app.bundle_id.as_deref(), Some("com.todesktop.cursor"));
                assert_eq!(app.name.as_deref(), Some("Cursor"));
            }
            _ => panic!("Expected app result"),
        }
    }

    #[test]
    fn prefers_predefined_websites_over_typed_domain_duplicates() {
        let search = CatalogSearch::from_items(Vec::new(), vec![website("Example", "example.com")]);

        let results = search.search("example.com", 12);

        assert_eq!(results.len(), 1);

        match &results[0] {
            CatalogSearchResultDto::Website { website, .. } => {
                assert_eq!(website.domain, "example.com");
                assert_eq!(website.name.as_deref(), Some("Example"));
            }
            _ => panic!("Expected website result"),
        }
    }

    #[test]
    fn creates_results_for_typed_domains() {
        let search = CatalogSearch::from_items(Vec::new(), Vec::new());

        let results = search.search("https://docs.example.com/page", 12);

        match &results[0] {
            CatalogSearchResultDto::Website { website, .. } => {
                assert_eq!(website.domain, "docs.example.com");
                assert_eq!(website.name.as_deref(), Some("docs.example.com"));
                assert_eq!(website.icon, None);
            }
            _ => panic!("Expected website result"),
        }
    }

    #[test]
    fn search_returns_results_without_icons() {
        let search = CatalogSearch::from_items(Vec::new(), vec![website("Example", "example.com")]);

        let results = search.search("example", 12);

        match &results[0] {
            CatalogSearchResultDto::Website { website, .. } => {
                assert_eq!(website.icon, None);
            }
            _ => panic!("Expected website result"),
        }
    }

    #[test]
    fn returns_no_results_for_empty_queries() {
        let search =
            CatalogSearch::from_items(vec![app("Cursor", "com.todesktop.cursor")], Vec::new());

        let results = search.search("   ", 12);

        assert!(results.is_empty());
    }

    #[test]
    fn truncates_to_the_requested_limit() {
        let websites = (0..20)
            .map(|index| {
                let domain = format!("example-{}.com", index);
                SearchableItem::website(
                    domain.clone(),
                    Some(format!("Example {}", index)),
                    vec![domain, "example".to_string()],
                )
            })
            .collect::<Vec<_>>();
        let search = CatalogSearch::from_items(Vec::new(), websites);

        let results = search.search("example", 12);

        assert_eq!(results.len(), 12);
    }

    #[test]
    fn falls_back_to_app_id_when_bundle_id_is_missing() {
        let item = SearchableItem::app("stable.app.cursor".to_string(), None, None);

        assert_eq!(item.id(), "stable.app.cursor");
        assert_eq!(item.name(), "stable.app.cursor");
        assert_eq!(item.keywords(), &["stable.app.cursor".to_string()]);
    }
}
