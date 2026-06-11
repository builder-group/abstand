use super::types::{App, Website};
use sqlx::{FromRow, Pool, QueryBuilder, Sqlite};
use std::{collections::HashMap, fmt};

pub struct CatalogRepository;

impl CatalogRepository {
    pub async fn upsert_app<'e, E>(
        executor: E,
        app: UpsertAppInput,
    ) -> Result<i64, CatalogRepositoryError>
    where
        E: sqlx::Executor<'e, Database = Sqlite>,
    {
        let id = sqlx::query_scalar::<_, i64>(
            "INSERT INTO app (stable_id, name, bundle_id, process_path, icon, color)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(stable_id) DO UPDATE SET
                bundle_id = COALESCE(excluded.bundle_id, app.bundle_id),
                name = COALESCE(excluded.name, app.name),
                process_path = COALESCE(excluded.process_path, app.process_path),
                icon = COALESCE(excluded.icon, app.icon),
                color = COALESCE(excluded.color, app.color)
            RETURNING id",
        )
        .bind(&app.stable_id)
        .bind(&app.name)
        .bind(&app.bundle_id)
        .bind(&app.process_path)
        .bind(&app.icon)
        .bind(&app.color)
        .fetch_one(executor)
        .await?;

        return Ok(id);
    }

    pub async fn upsert_website<'e, E>(
        executor: E,
        website: UpsertWebsiteInput,
    ) -> Result<i64, CatalogRepositoryError>
    where
        E: sqlx::Executor<'e, Database = Sqlite>,
    {
        let id = sqlx::query_scalar::<_, i64>(
            "INSERT INTO website (hostname, name, icon, color)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(hostname) DO UPDATE SET
                name = COALESCE(excluded.name, website.name),
                icon = COALESCE(excluded.icon, website.icon),
                color = COALESCE(excluded.color, website.color)
            RETURNING id",
        )
        .bind(&website.hostname)
        .bind(&website.name)
        .bind(&website.icon)
        .bind(&website.color)
        .fetch_one(executor)
        .await?;

        return Ok(id);
    }

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
                name: row.name,
                bundle_id: row.bundle_id,
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
            "SELECT id, hostname, name, icon, color FROM website WHERE id IN (",
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
                    hostname,
                    name,
                    icon,
                    color,
                } = row;

                return Website {
                    id,
                    name,
                    hostname,
                    icon,
                    color,
                };
            })
            .collect());
    }

    pub async fn get_app_by_bundle_id(
        pool: &Pool<Sqlite>,
        bundle_id: &str,
    ) -> Result<Option<App>, CatalogRepositoryError> {
        let row = sqlx::query_as::<_, AppRow>(
            "SELECT id, stable_id, bundle_id, name, process_path, icon, color FROM app WHERE bundle_id = ? LIMIT 1",
        )
        .bind(bundle_id)
        .fetch_optional(pool)
        .await?;

        return Ok(row.map(|row| App {
            id: row.id,
            stable_id: row.stable_id,
            name: row.name,
            bundle_id: row.bundle_id,
            process_path: row.process_path,
            icon: row.icon,
            color: row.color,
        }));
    }

    pub async fn get_website_by_hostname(
        pool: &Pool<Sqlite>,
        hostname: &str,
    ) -> Result<Option<Website>, CatalogRepositoryError> {
        let row = sqlx::query_as::<_, WebsiteRow>(
            "SELECT id, hostname, name, icon, color FROM website WHERE hostname = ? LIMIT 1",
        )
        .bind(hostname)
        .fetch_optional(pool)
        .await?;

        return Ok(row.map(|row| Website {
            id: row.id,
            name: row.name,
            hostname: row.hostname,
            icon: row.icon,
            color: row.color,
        }));
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

// MARK: - Input

pub struct UpsertAppInput {
    pub stable_id: String,
    pub name: Option<String>,
    pub bundle_id: Option<String>,
    pub process_path: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
}

pub struct UpsertWebsiteInput {
    pub hostname: String,
    pub name: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
}

// MARK: - Row

#[derive(Debug, Clone, FromRow)]
struct AppRow {
    id: i64,
    stable_id: String,
    name: Option<String>,
    bundle_id: Option<String>,
    process_path: Option<String>,
    icon: Option<String>,
    color: Option<String>,
}

#[derive(Debug, Clone, FromRow)]
struct WebsiteRow {
    id: i64,
    hostname: String,
    name: Option<String>,
    icon: Option<String>,
    color: Option<String>,
}
