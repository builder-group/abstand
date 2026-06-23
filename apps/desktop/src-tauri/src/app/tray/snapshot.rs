use crate::{
    common::time::unix_ms_now,
    modules::{
        db::types::DatabaseState,
        intentions::today::{self, TodayActiveIntention, TodayUpcomingIntention},
    },
};
use tauri::{AppHandle, Manager};

pub struct TrayMenuSnapshot {
    pub active: Vec<TodayActiveIntention>,
    pub upcoming_today: Vec<TodayUpcomingIntention>,
}

impl TrayMenuSnapshot {
    pub async fn load(app: &AppHandle) -> Result<Self, String> {
        let database_state = app.state::<DatabaseState>();
        let now = unix_ms_now();
        let active = today::get_active(&database_state.pool).await?;
        let upcoming_today = today::get_upcoming(&database_state.pool, now).await?;

        return Ok(Self {
            active,
            upcoming_today,
        });
    }
}
