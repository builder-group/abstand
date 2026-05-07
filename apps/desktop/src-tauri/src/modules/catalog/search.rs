use super::{
    app_identity::resolve_app_identity, matcher::fuzzy_match, predefined::PREDEFINED_SERVICES,
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
    pub fn search(&self, query: &str, limit: usize) -> Vec<CatalogSearchResult> {
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
            .map(|(item, score)| CatalogSearchResult::from((item.clone(), score)))
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
                SearchableItem::app(identity.stable_id, identity.bundle_id, Some(app.name))
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
    pub fn app(stable_id: String, bundle_id: Option<String>, name: Option<String>) -> Self {
        let mut keywords = vec![stable_id.clone()];
        if let Some(bundle_id) = bundle_id.as_ref() {
            keywords.push(bundle_id.clone());
        }

        return Self::App {
            keywords,
            app: SearchableApp {
                stable_id,
                bundle_id,
                name,
            },
        };
    }

    pub fn website(domain: String, name: Option<String>, keywords: Vec<String>) -> Self {
        return Self::Website {
            website: SearchableWebsite { domain, name },
            keywords,
        };
    }

    pub fn custom_domain(domain: String) -> Self {
        return Self::website(domain.clone(), Some(domain.clone()), vec![domain]);
    }

    pub fn id(&self) -> &str {
        return match self {
            Self::App { app, .. } => &app.stable_id,
            Self::Website { website, .. } => &website.domain,
        };
    }

    pub fn name(&self) -> &str {
        return match self {
            Self::App { app, .. } => app
                .name
                .as_deref()
                .or(app.bundle_id.as_deref())
                .unwrap_or(&app.stable_id),
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

#[derive(Debug, Clone)]
pub enum CatalogSearchResult {
    App {
        app: SearchableApp,
        score: u32,
    },
    Website {
        website: SearchableWebsite,
        score: u32,
    },
}

impl From<(SearchableItem, u32)> for CatalogSearchResult {
    fn from((item, score): (SearchableItem, u32)) -> Self {
        return match item {
            SearchableItem::App { app, .. } => Self::App { app, score },
            SearchableItem::Website { website, .. } => Self::Website { website, score },
        };
    }
}

#[derive(Debug, Clone)]
pub struct SearchableApp {
    pub stable_id: String,
    pub bundle_id: Option<String>,
    pub name: Option<String>,
}

#[derive(Debug, Clone)]
pub struct SearchableWebsite {
    pub domain: String,
    pub name: Option<String>,
}
