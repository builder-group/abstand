use super::types::{App, Website};
use sqlx::{FromRow, Pool, QueryBuilder, Sqlite};
use std::{collections::HashMap, fmt};

pub struct CatalogRepository;

impl CatalogRepository {
    pub async fn get_apps_by_ids(
        pool: &Pool<Sqlite>,
        app_ids: &[i64],
    ) -> Result<Vec<App>, CatalogRepositoryError> {
        if app_ids.is_empty() {
            return Ok(Vec::new());
        }

        let mut query_builder = QueryBuilder::<Sqlite>::new(
            "SELECT id, stable_id, bundle_id, name, process_path, icon, color FROM app WHERE id IN (",
        );
        let mut separated = query_builder.separated(", ");
        for app_id in app_ids {
            separated.push_bind(app_id);
        }
        separated.push_unseparated(")");

        let mut rows = query_builder
            .build_query_as::<AppRow>()
            .fetch_all(pool)
            .await?;

        let positions = Self::positions_by_id(app_ids);
        // Restore the caller's requested order after the SQL IN query
        rows.sort_by_key(|row| positions.get(&row.id).copied().unwrap_or(usize::MAX));

        return Ok(rows
            .into_iter()
            .map(|row| App {
                id: row.id,
                stable_id: row.stable_id,
                bundle_id: row.bundle_id,
                name: row.name,
                process_path: row.process_path,
                icon: row.icon,
                color: row.color,
            })
            .collect());
    }

    pub async fn get_websites_by_ids(
        pool: &Pool<Sqlite>,
        website_ids: &[i64],
    ) -> Result<Vec<Website>, CatalogRepositoryError> {
        if website_ids.is_empty() {
            return Ok(Vec::new());
        }

        let mut query_builder = QueryBuilder::<Sqlite>::new(
            "SELECT id, domain, name, icon, color FROM website WHERE id IN (",
        );
        let mut separated = query_builder.separated(", ");
        for website_id in website_ids {
            separated.push_bind(website_id);
        }
        separated.push_unseparated(")");

        let mut rows = query_builder
            .build_query_as::<WebsiteRow>()
            .fetch_all(pool)
            .await?;

        let positions = Self::positions_by_id(website_ids);
        // Restore the caller's requested order after the SQL IN query
        rows.sort_by_key(|row| positions.get(&row.id).copied().unwrap_or(usize::MAX));

        return Ok(rows
            .into_iter()
            .map(|row| {
                let WebsiteRow {
                    id,
                    domain,
                    name,
                    icon,
                    color,
                } = row;

                return Website {
                    id,
                    name: name.unwrap_or_else(|| domain.clone()),
                    domain,
                    icon,
                    color,
                };
            })
            .collect());
    }

    fn positions_by_id(ids: &[i64]) -> HashMap<i64, usize> {
        return ids
            .iter()
            .enumerate()
            .map(|(index, id)| (*id, index))
            .collect::<HashMap<_, _>>();
    }
}

#[derive(Debug)]
pub enum CatalogRepositoryError {
    Database(sqlx::Error),
}

impl fmt::Display for CatalogRepositoryError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        return match self {
            Self::Database(error) => write!(f, "{}", error),
        };
    }
}

impl From<sqlx::Error> for CatalogRepositoryError {
    fn from(value: sqlx::Error) -> Self {
        return Self::Database(value);
    }
}

// MARK: - Row

#[derive(Debug, Clone, FromRow)]
struct AppRow {
    id: i64,
    stable_id: String,
    bundle_id: Option<String>,
    name: String,
    process_path: Option<String>,
    icon: Option<String>,
    color: Option<String>,
}

#[derive(Debug, Clone, FromRow)]
struct WebsiteRow {
    id: i64,
    domain: String,
    name: Option<String>,
    icon: Option<String>,
    color: Option<String>,
}
