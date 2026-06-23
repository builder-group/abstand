use super::snapshot::TrayMenuSnapshot;
#[cfg(debug_assertions)]
use crate::modules::recovery_agent::agent::RecoveryAgent;
use crate::{
    app::window::AppWindow,
    modules::{
        intentions::intention::{
            Intention, IntentionBehavior, IntentionBlock, IntentionBlockScope,
            IntentionBlockTargetAction, IntentionConditionRule, IntentionConditionTransition,
        },
        intentions::today::TodayActiveIntention,
        quit_policy::{policy::request_quit_blocking, types::QuitRequestSource},
    },
};
use chrono::{Local, TimeZone};
use tauri::{
    menu::{Menu, MenuBuilder, MenuItem},
    AppHandle,
};

pub struct TrayMenu {
    entries: Vec<TrayMenuEntry>,
}

impl TrayMenu {
    fn new() -> Self {
        return Self {
            entries: Vec::new(),
        };
    }

    pub async fn build(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
        let snapshot = match TrayMenuSnapshot::load(app).await {
            Ok(snapshot) => snapshot,
            Err(error) => {
                log::warn!(target: LOG_TARGET, "failed to load tray menu state: {}", error);
                return Self::from_error_status("Could not load Abstand state")
                    .into_tauri_menu(app);
            }
        };

        return Self::from_snapshot(snapshot).into_tauri_menu(app);
    }

    pub fn handle_event(app: &AppHandle, id: &str) {
        let Some(item) = TrayMenuItem::from_id(id) else {
            return;
        };

        item.handle(app);
    }

    fn from_snapshot(snapshot: TrayMenuSnapshot) -> Self {
        let mut menu = Self::new();
        menu.append_status(&snapshot);
        menu.append_primary_actions(&snapshot);
        menu.append_utility_actions();
        menu.append_dev_actions();
        return menu;
    }

    fn from_error_status(status: &str) -> Self {
        let mut menu = Self::new();
        menu.append(TrayMenuEntry::label("tray_status_error", status));
        menu.append(TrayMenuEntry::separator());
        menu.append(TrayMenuEntry::action(TrayMenuItem::OpenAbstand));
        menu.append(TrayMenuEntry::separator());
        menu.append(TrayMenuEntry::action(TrayMenuItem::Quit));
        menu.append_dev_actions();
        return menu;
    }

    fn append(&mut self, entry: TrayMenuEntry) {
        self.entries.push(entry);
    }

    fn append_status(&mut self, snapshot: &TrayMenuSnapshot) {
        let Some(active) = snapshot.active.first() else {
            self.append(TrayMenuEntry::label(
                "tray_status_idle",
                "No active Intention",
            ));
            if let Some(upcoming) = snapshot.upcoming_today.first() {
                self.append(TrayMenuEntry::label(
                    "tray_status_next",
                    format!(
                        "Next: {} at {}",
                        upcoming.intention.name,
                        format_display_time(upcoming.trigger_at)
                    ),
                ));
            }
            if snapshot.upcoming_today.len() > 1 {
                self.append(TrayMenuEntry::label(
                    "tray_status_upcoming_additional",
                    format!("{} more upcoming", snapshot.upcoming_today.len() - 1),
                ));
            }

            return;
        };

        self.append(TrayMenuEntry::label(
            format!("tray_status_active_{}", active.session.id),
            active.intention.name.as_str(),
        ));
        self.append(TrayMenuEntry::label(
            format!("tray_status_active_detail_{}", active.session.id),
            format_active_detail(active),
        ));

        if snapshot.active.len() > 1 {
            self.append(TrayMenuEntry::label(
                "tray_status_active_additional",
                format!("{} more active", snapshot.active.len() - 1),
            ));
        }
    }

    fn append_primary_actions(&mut self, snapshot: &TrayMenuSnapshot) {
        self.append(TrayMenuEntry::separator());
        self.append(TrayMenuEntry::action(TrayMenuItem::OpenAbstand));

        let Some(active) = snapshot.active.first() else {
            self.append(TrayMenuEntry::action(TrayMenuItem::NewBlockIntention));
            return;
        };

        self.append(TrayMenuEntry::action(TrayMenuItem::OpenIntention(
            active.intention.id,
        )));
        self.append(TrayMenuEntry::action_with_label(
            TrayMenuItem::EndIntention(active.intention.id),
            end_intention_label(&active.intention),
        ));
    }

    fn append_utility_actions(&mut self) {
        self.append(TrayMenuEntry::separator());
        self.append(TrayMenuEntry::action(TrayMenuItem::OpenSettings));
        self.append(TrayMenuEntry::action(TrayMenuItem::OpenUpdatesSettings));
        self.append(TrayMenuEntry::separator());
        self.append(TrayMenuEntry::action(TrayMenuItem::Quit));
    }

    // Development escape hatch in the tray so it remains accessible even if
    // Strict Enforcement blocks normal quit or the main window is hidden or broken
    fn append_dev_actions(&mut self) {
        #[cfg(debug_assertions)]
        self.append(TrayMenuEntry::action(TrayMenuItem::DevForceQuit));
    }

    fn into_tauri_menu(self, app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
        let mut builder = MenuBuilder::new(app);

        for entry in self.entries {
            builder = match entry {
                TrayMenuEntry::Action { item, label } => {
                    let menu_item = MenuItem::with_id(app, item.id(), label, true, None::<&str>)?;
                    builder.item(&menu_item)
                }
                TrayMenuEntry::Label { id, label } => {
                    let menu_item = MenuItem::with_id(app, id, label, false, None::<&str>)?;
                    builder.item(&menu_item)
                }
                TrayMenuEntry::Separator => builder.separator(),
            };
        }

        return builder.build();
    }
}

enum TrayMenuEntry {
    Action { item: TrayMenuItem, label: String },
    Label { id: String, label: String },
    Separator,
}

impl TrayMenuEntry {
    fn action(item: TrayMenuItem) -> Self {
        return Self::Action {
            item,
            label: item.label().to_string(),
        };
    }

    fn action_with_label(item: TrayMenuItem, label: impl Into<String>) -> Self {
        return Self::Action {
            item,
            label: label.into(),
        };
    }

    fn label(id: impl Into<String>, label: impl Into<String>) -> Self {
        return Self::Label {
            id: id.into(),
            label: label.into(),
        };
    }

    fn separator() -> Self {
        return Self::Separator;
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum TrayMenuItem {
    OpenAbstand,
    OpenIntention(i64),
    EndIntention(i64),
    NewBlockIntention,
    OpenSettings,
    OpenUpdatesSettings,
    Quit,
    #[cfg(debug_assertions)]
    DevForceQuit,
}

impl TrayMenuItem {
    fn id(&self) -> String {
        return match self {
            Self::OpenAbstand => "tray_open_abstand".to_string(),
            Self::OpenIntention(intention_id) => {
                format!("tray_open_intention_{}", intention_id)
            }
            Self::EndIntention(intention_id) => format!("tray_end_intention_{}", intention_id),
            Self::NewBlockIntention => "tray_new_block_intention".to_string(),
            Self::OpenSettings => "tray_settings".to_string(),
            Self::OpenUpdatesSettings => "tray_updates".to_string(),
            Self::Quit => "tray_quit_app".to_string(),
            #[cfg(debug_assertions)]
            Self::DevForceQuit => "tray_dev_force_quit".to_string(),
        };
    }

    fn label(&self) -> &'static str {
        return match self {
            Self::OpenAbstand => "Open Abstand",
            Self::OpenIntention(_) => "Open Current Intention",
            Self::EndIntention(_) => "End Intention",
            Self::NewBlockIntention => "New Block Intention...",
            Self::OpenSettings => "Settings...",
            Self::OpenUpdatesSettings => "Check for Updates...",
            Self::Quit => "Quit",
            #[cfg(debug_assertions)]
            Self::DevForceQuit => "Force Quit (Dev)",
        };
    }

    fn from_id(id: &str) -> Option<Self> {
        if let Some(intention_id) = parse_tray_intention_id(id, "tray_open_intention_") {
            return Some(Self::OpenIntention(intention_id));
        }
        if let Some(intention_id) = parse_tray_intention_id(id, "tray_end_intention_") {
            return Some(Self::EndIntention(intention_id));
        }

        return match id {
            "tray_open_abstand" => Some(Self::OpenAbstand),
            "tray_new_block_intention" => Some(Self::NewBlockIntention),
            "tray_settings" => Some(Self::OpenSettings),
            "tray_updates" => Some(Self::OpenUpdatesSettings),
            "tray_quit_app" => Some(Self::Quit),
            #[cfg(debug_assertions)]
            "tray_dev_force_quit" => Some(Self::DevForceQuit),
            _ => None,
        };
    }

    fn handle(&self, app: &AppHandle) {
        match self {
            Self::OpenAbstand => {
                let _ = AppWindow::Main.show(app);
            }
            Self::OpenIntention(intention_id) => {
                let _ = AppWindow::Main.show_at(app, &format!("/intentions/{}", intention_id));
            }
            Self::EndIntention(intention_id) => {
                let _ = AppWindow::Main
                    .show_at(app, &format!("/intentions/{}?action=end", intention_id));
            }
            Self::NewBlockIntention => {
                let _ = AppWindow::Main.show_at(app, "/intentions/new/block");
            }
            Self::OpenSettings => {
                let _ = AppWindow::Main.show_at(app, "/settings/general");
            }
            Self::OpenUpdatesSettings => {
                let _ = AppWindow::Main.show_at(app, "/settings/general#updates");
            }
            Self::Quit => {
                request_quit_blocking(app, QuitRequestSource::Tray);
            }
            #[cfg(debug_assertions)]
            Self::DevForceQuit => {
                if let Ok(agent) = RecoveryAgent::for_current_app() {
                    let _ = agent.disable_unchecked();
                }

                std::process::exit(0);
            }
        }
    }
}

fn format_active_detail(active: &TodayActiveIntention) -> String {
    let time_label = if let Some(automatic_end_at) = active.automatic_end_at {
        format!("Until {}", format_display_time(automatic_end_at))
    } else {
        format!("Started {}", format_display_time(active.session.started_at))
    };

    return format!(
        "{} · {}",
        time_label,
        format_intention_behavior(&active.intention)
    );
}

fn format_display_time(timestamp_ms: i64) -> String {
    let Some(datetime) = Local.timestamp_millis_opt(timestamp_ms).single() else {
        return "--:--".to_string();
    };

    return datetime.format("%-I:%M %p").to_string();
}

fn format_intention_behavior(intention: &Intention) -> String {
    return match &intention.behavior {
        IntentionBehavior::Block(block) => format_block_scope(block),
        IntentionBehavior::Break => "Break".to_string(),
    };
}

fn format_block_scope(block: &IntentionBlock) -> String {
    return match block.scope {
        IntentionBlockScope::WholeDevice => "Whole device".to_string(),
        IntentionBlockScope::AllowTargets => {
            let app_count = count_app_targets(block, IntentionBlockTargetAction::Allow);
            let website_count = count_website_targets(block, IntentionBlockTargetAction::Allow);
            format!("Allows {}", format_target_counts(app_count, website_count))
        }
        IntentionBlockScope::BlockTargets => {
            let app_count = count_app_targets(block, IntentionBlockTargetAction::Block);
            let website_count = count_website_targets(block, IntentionBlockTargetAction::Block);
            format!("Blocks {}", format_target_counts(app_count, website_count))
        }
    };
}

fn count_app_targets(block: &IntentionBlock, action: IntentionBlockTargetAction) -> usize {
    return block
        .app_targets
        .iter()
        .filter(|target| target.action == action)
        .count();
}

fn count_website_targets(block: &IntentionBlock, action: IntentionBlockTargetAction) -> usize {
    return block
        .website_targets
        .iter()
        .filter(|target| target.action == action)
        .count();
}

fn format_target_counts(app_count: usize, website_count: usize) -> String {
    let mut parts = Vec::new();
    if app_count > 0 {
        parts.push(format!(
            "{} {}",
            app_count,
            if app_count == 1 { "app" } else { "apps" }
        ));
    }
    if website_count > 0 {
        parts.push(format!(
            "{} {}",
            website_count,
            if website_count == 1 {
                "website"
            } else {
                "websites"
            }
        ));
    }

    return if parts.is_empty() {
        "no targets".to_string()
    } else {
        parts.join(", ")
    };
}

fn end_intention_label(intention: &Intention) -> &'static str {
    return if has_manual_end_condition(intention) {
        "End Intention"
    } else {
        "End early..."
    };
}

fn has_manual_end_condition(intention: &Intention) -> bool {
    return intention.conditions.iter().any(|condition| {
        condition.transition == IntentionConditionTransition::End
            && matches!(condition.rule, IntentionConditionRule::Manual)
    });
}

fn parse_tray_intention_id(id: &str, prefix: &str) -> Option<i64> {
    return id.strip_prefix(prefix)?.parse().ok();
}

const LOG_TARGET: &str = "app::tray::menu";
