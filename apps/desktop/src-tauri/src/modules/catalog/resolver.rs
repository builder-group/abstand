use super::{
    repository::{CatalogRepository, CatalogRepositoryError, UpsertAppInput},
    types::{App, Website},
};
use crate::modules::db::types::DatabaseState;
use tauri::{AppHandle, Manager};

pub async fn resolve_app_by_bundle_id(
    app: &AppHandle,
    bundle_id: &str,
) -> Result<Option<App>, CatalogRepositoryError> {
    let database_state = app.state::<DatabaseState>();
    let Some(app) =
        CatalogRepository::get_app_by_bundle_id(&database_state.pool, bundle_id).await?
    else {
        return Ok(None);
    };

    return hydrate_app_asset_if_missing(&database_state, app)
        .await
        .map(Some);
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

async fn hydrate_app_asset_if_missing(
    database_state: &DatabaseState,
    app: App,
) -> Result<App, CatalogRepositoryError> {
    if app.icon.is_some() && app.color.is_some() {
        return Ok(app);
    }

    let Some(bundle_id) = app.bundle_id.clone() else {
        return Ok(app);
    };

    let icon_data = match tauri::async_runtime::spawn_blocking(move || {
        mado::get_app_icon(&bundle_id, 64, true)
    })
    .await
    {
        Ok(icon_data) => icon_data,
        Err(error) => {
            log::warn!(
                target: LOG_TARGET,
                "failed to hydrate app asset for {}: {}",
                app.stable_id,
                error
            );
            return Ok(app);
        }
    };

    let icon = icon_data.data_url.or_else(|| app.icon.clone());
    let color = icon_data.color.or_else(|| app.color.clone());
    if icon == app.icon && color == app.color {
        return Ok(app);
    }

    CatalogRepository::upsert_app(
        &database_state.pool,
        UpsertAppInput {
            stable_id: app.stable_id.clone(),
            name: app.name.clone(),
            bundle_id: app.bundle_id.clone(),
            process_path: app.process_path.clone(),
            icon: icon.clone(),
            color: color.clone(),
        },
    )
    .await?;

    return Ok(App { icon, color, ..app });
}

const LOG_TARGET: &str = "modules::catalog::resolver";

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
