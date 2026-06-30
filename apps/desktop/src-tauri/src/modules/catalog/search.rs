use super::{
    app_identity::resolve_app_identity, matcher::fuzzy_match, predefined::PREDEFINED_SERVICES,
};
use crate::common::url::extract_website_target;
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
    pub fn search(&self, query: &str, limit: usize) -> Vec<CatalogSearchResult> {
        let trimmed_query = query.trim();
        if trimmed_query.is_empty() {
            return Vec::new();
        }

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
            .chain(self.websites.iter())
            .chain(custom_website.iter());

        let fuzzy_match_query = query_website_target
            .as_ref()
            .map(|target| target.hostname.as_str())
            .unwrap_or(trimmed_query);
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
            .map(|app| {
                let identity = resolve_app_identity(&app.bundle_id, &app.name, &app.path);
                SearchableItem::app(SearchableApp {
                    stable_id: identity.stable_id,
                    name: Some(app.name),
                    bundle_id: identity.bundle_id,
                    process_path: Some(app.path),
                })
            })
            .collect();
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
