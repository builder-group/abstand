use super::{
    app_identity::resolve_app_identity, matcher::fuzzy_match, predefined::PREDEFINED_SERVICES,
};
use crate::common::url::extract_website_target;
use mado::{get_installed_app, get_installed_apps, InstalledApp, InstalledAppsConfig};
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

    /// Searches cached catalog items, installed apps by bundle ID, and custom websites.
    pub fn search(&self, query: &str, limit: usize) -> Vec<CatalogSearchResult> {
        let trimmed_query = query.trim();
        if trimmed_query.is_empty() {
            return Vec::new();
        }

        let is_known_app = self.apps.iter().any(|item| {
            return item
                .bundle_id()
                .is_some_and(|bundle_id| bundle_id.eq_ignore_ascii_case(trimmed_query));
        });
        let custom_app = if is_known_app {
            None
        } else {
            get_installed_app(
                trimmed_query,
                InstalledAppsConfig {
                    include_icon: false,
                    include_app_color: false,
                    icon_size: 0,
                },
            )
            .map(Self::searchable_app)
        };
        let has_exact_app_match = is_known_app || custom_app.is_some();

        let query_website_target = extract_website_target(trimmed_query);
        let custom_website = query_website_target.as_ref().and_then(|target| {
            let is_known_website = self
                .websites
                .iter()
                .any(|item| item.id() == target.hostname);
            return (!is_known_website)
                .then(|| SearchableItem::custom_hostname(target.hostname.clone()));
        });

        let items = self
            .apps
            .iter()
            .chain(custom_app.iter())
            .chain(self.websites.iter())
            .chain(custom_website.iter())
            // Note: Bundle IDs can look like hostnames, so an exact app match excludes website results
            .filter(|item| !has_exact_app_match || item.is_app());

        let fuzzy_match_query = if has_exact_app_match {
            trimmed_query
        } else {
            query_website_target
                .as_ref()
                .map(|target| target.hostname.as_str())
                .unwrap_or(trimmed_query)
        };
        let matches = fuzzy_match(items, fuzzy_match_query);

        let mut seen_ids = HashSet::<String>::new();
        return matches
            .into_iter()
            // Keep only the best result for each stable identifier
            .filter(|(item, _)| seen_ids.insert(item.id().to_string()))
            .take(limit)
            .map(|(item, score)| match item {
                SearchableItem::App { app, .. } => CatalogSearchResult::App {
                    app: app.clone(),
                    score,
                },
                SearchableItem::Website { website, .. } => CatalogSearchResult::Website {
                    website: website.clone(),
                    // Note: Paths are query-specific, not catalog metadata. Attach the parsed path only when
                    // this website result is the hostname the user typed.
                    path: query_website_target
                        .as_ref()
                        .filter(|target| target.hostname == website.hostname)
                        .and_then(|target| target.path.clone()),
                    score,
                },
            })
            .collect();
    }

    /// Loads searchable app items from installed native apps.
    fn load_apps() -> Vec<SearchableItem> {
        let config = InstalledAppsConfig {
            include_icon: false,
            include_app_color: false,
            icon_size: 0,
        };

        return get_installed_apps(config)
            .into_iter()
            .map(Self::searchable_app)
            .collect();
    }

    fn searchable_app(app: InstalledApp) -> SearchableItem {
        let identity = resolve_app_identity(&app.bundle_id, &app.name, &app.path);
        return SearchableItem::app(SearchableApp {
            stable_id: identity.stable_id,
            name: Some(app.name),
            bundle_id: identity.bundle_id,
            process_path: Some(app.path),
        });
    }

    /// Loads searchable website items from predefined services.
    fn load_websites() -> Vec<SearchableItem> {
        let mut items = Vec::new();

        for service in PREDEFINED_SERVICES {
            let mut keywords = Vec::with_capacity(
                service.hostnames.len() + service.aliases.len() + service.bundle_ids.len(),
            );
            keywords.extend(
                service
                    .hostnames
                    .iter()
                    .map(|hostname| (*hostname).to_string()),
            );
            keywords.extend(service.aliases.iter().map(|alias| (*alias).to_string()));

            // Note: Keep the bundle IDs on the service model for future grouping work,
            // but do not feed them into website matching yet
            for hostname in service.hostnames {
                items.push(SearchableItem::website(
                    SearchableWebsite {
                        hostname: (*hostname).to_string(),
                        name: Some(service.name.to_string()),
                    },
                    keywords.clone(),
                ));
            }
        }

        return items;
    }
}

// MARK: - Searchable Item

#[derive(Debug, Clone)]
pub enum SearchableItem {
    App {
        app: SearchableApp,
        keywords: Vec<String>,
    },
    Website {
        website: SearchableWebsite,
        keywords: Vec<String>,
    },
}

impl SearchableItem {
    pub fn app(app: SearchableApp) -> Self {
        let mut keywords = vec![app.stable_id.clone()];
        if let Some(bundle_id) = app.bundle_id.as_ref() {
            keywords.push(bundle_id.clone());
        }
        if let Some(process_path) = app.process_path.as_ref() {
            keywords.push(process_path.clone());
        }

        return Self::App { keywords, app };
    }

    pub fn website(website: SearchableWebsite, keywords: Vec<String>) -> Self {
        return Self::Website { website, keywords };
    }

    pub fn custom_hostname(hostname: String) -> Self {
        return Self::website(
            SearchableWebsite {
                hostname: hostname.clone(),
                name: None,
            },
            vec![hostname],
        );
    }

    pub fn id(&self) -> &str {
        return match self {
            Self::App { app, .. } => &app.stable_id,
            Self::Website { website, .. } => &website.hostname,
        };
    }

    fn bundle_id(&self) -> Option<&str> {
        return match self {
            Self::App { app, .. } => app.bundle_id.as_deref(),
            Self::Website { .. } => None,
        };
    }

    fn is_app(&self) -> bool {
        return matches!(self, Self::App { .. });
    }

    pub fn display_name(&self) -> &str {
        return match self {
            Self::App { app, .. } => app
                .name
                .as_deref()
                .or(app.bundle_id.as_deref())
                .or(app.process_path.as_deref())
                .unwrap_or(&app.stable_id),
            Self::Website { website, .. } => website.name.as_deref().unwrap_or(&website.hostname),
        };
    }

    pub fn keywords(&self) -> &[String] {
        return match self {
            Self::App { keywords, .. } => keywords,
            Self::Website { keywords, .. } => keywords,
        };
    }
}

#[derive(Debug, Clone)]
pub enum CatalogSearchResult {
    App {
        app: SearchableApp,
        score: u32,
    },
    Website {
        website: SearchableWebsite,
        path: Option<String>,
        score: u32,
    },
}

#[derive(Debug, Clone)]
pub struct SearchableApp {
    pub stable_id: String,
    pub name: Option<String>,
    pub bundle_id: Option<String>,
    pub process_path: Option<String>,
}

#[derive(Debug, Clone)]
pub struct SearchableWebsite {
    pub hostname: String,
    pub name: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn catalog_search() -> CatalogSearch {
        return CatalogSearch {
            apps: vec![SearchableItem::app(SearchableApp {
                stable_id: "com.example.Reader".to_string(),
                name: Some("Reader".to_string()),
                bundle_id: Some("com.example.Reader".to_string()),
                process_path: Some("/Applications/Reader.app".to_string()),
            })],
            websites: vec![SearchableItem::website(
                SearchableWebsite {
                    hostname: "docs.example.com".to_string(),
                    name: Some("Example Docs".to_string()),
                },
                vec!["docs.example.com".to_string()],
            )],
        };
    }

    #[test]
    fn finds_catalog_app_by_bundle_id() {
        let results = catalog_search().search("com.example.Reader", 20);

        assert_eq!(results.len(), 1);
        let CatalogSearchResult::App { app, .. } = &results[0] else {
            panic!("catalog app query should resolve as an app");
        };
        assert_eq!(app.bundle_id.as_deref(), Some("com.example.Reader"));
    }

    #[test]
    fn finds_catalog_website_by_hostname() {
        let results = catalog_search().search("docs.example.com", 20);

        assert_eq!(results.len(), 1);
        let CatalogSearchResult::Website { website, path, .. } = &results[0] else {
            panic!("catalog website query should resolve as a website");
        };
        assert_eq!(website.hostname, "docs.example.com");
        assert_eq!(website.name.as_deref(), Some("Example Docs"));
        assert_eq!(path, &None);
    }

    #[test]
    fn returns_custom_website_with_path() {
        let results = catalog_search().search("https://outside.example/reference/", 20);

        assert_eq!(results.len(), 1);
        let CatalogSearchResult::Website { website, path, .. } = &results[0] else {
            panic!("custom URL should resolve as a website");
        };
        assert_eq!(website.hostname, "outside.example");
        assert_eq!(website.name, None);
        assert_eq!(path.as_deref(), Some("/reference"));
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn returns_installed_app_missing_from_catalog() {
        let search = CatalogSearch {
            apps: Vec::new(),
            websites: Vec::new(),
        };

        let results = search.search("com.apple.finder", 20);

        assert_eq!(results.len(), 1);
        let CatalogSearchResult::App { app, .. } = &results[0] else {
            panic!("installed bundle ID should resolve as an app");
        };
        assert_eq!(app.bundle_id.as_deref(), Some("com.apple.finder"));
        assert!(app
            .process_path
            .as_deref()
            .is_some_and(|path| path.ends_with("/Finder.app")));
    }

    #[test]
    fn returns_no_results_for_unmatched_query() {
        let results = catalog_search().search("zzzz-unmatched", 20);

        assert!(results.is_empty());
    }
}
