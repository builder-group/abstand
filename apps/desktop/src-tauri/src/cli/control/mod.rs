//! Connects CLI requests to the running app through a private Unix socket.

mod client;
mod protocol;
mod server;

pub use client::send;
pub use protocol::ControlRequest;
pub use server::setup;

use crate::environment::{configs::app::AppConfig, path::get_app_support_dir};
use std::path::PathBuf;

fn socket_path() -> Result<PathBuf, String> {
    return get_app_support_dir(AppConfig::bundle_identifier())
        .map(|path| path.join("cli").join("control.sock"))
        .map_err(|error| error.to_string());
}
