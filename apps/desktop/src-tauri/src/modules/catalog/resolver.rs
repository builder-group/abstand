use super::{
    repository::{CatalogRepository, CatalogRepositoryError},
    types::{App, Website},
};
use crate::modules::db::types::DatabaseState;
use tauri::{AppHandle, Manager};

pub async fn resolve_app_by_bundle_id(
    app: &AppHandle,
    bundle_id: &str,
) -> Result<Option<App>, CatalogRepositoryError> {
    let database_state = app.state::<DatabaseState>();
    return CatalogRepository::get_app_by_bundle_id(&database_state.pool, bundle_id).await;
}

/// Resolves an exact hostname first, then parent domains such as `example.com`.
pub async fn resolve_website_by_hostname(
    app: &AppHandle,
    hostname: &str,
) -> Result<Option<Website>, CatalogRepositoryError> {
    let database_state = app.state::<DatabaseState>();
    for candidate in hostname_candidates(hostname) {
        if let Some(website) =
            CatalogRepository::get_website_by_hostname(&database_state.pool, candidate).await?
        {
            return Ok(Some(website));
        }
    }

    return Ok(None);
}

fn hostname_candidates(hostname: &str) -> impl Iterator<Item = &str> {
    return std::iter::once(hostname).chain(
        hostname
            .match_indices('.')
            .map(|(index, _)| &hostname[index + 1..])
            .filter(|candidate| candidate.contains('.')),
    );
}

#[cfg(test)]
mod tests {
    use super::hostname_candidates;

    #[test]
    fn hostname_candidates_try_exact_then_parent_domains() {
        let candidates = hostname_candidates("www.docs.example.com").collect::<Vec<_>>();

        assert_eq!(
            candidates,
            vec!["www.docs.example.com", "docs.example.com", "example.com"]
        );
    }
}
