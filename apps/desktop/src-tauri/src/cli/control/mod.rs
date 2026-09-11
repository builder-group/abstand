//! Connects CLI requests to the running app through a private Unix socket.

mod client;
mod protocol;
mod server;

pub use client::send;
pub use protocol::ControlRequest;
pub use server::setup;

use crate::environment::configs::app::AppConfig;
use std::{
    fs,
    os::unix::fs::MetadataExt,
    path::{Path, PathBuf},
};

fn socket_path() -> PathBuf {
    let user_id = unsafe { libc::geteuid() };
    // Note: macOS limits Unix socket paths to 103 bytes, so avoid HOME and TMPDIR
    return PathBuf::from(format!("/tmp/abstand-{}", user_id))
        .join(format!("{}.sock", AppConfig::bundle_identifier()));
}

fn validate_socket_directory(directory: &Path) -> Result<(), String> {
    let metadata = fs::symlink_metadata(directory).map_err(|error| error.to_string())?;
    if !metadata.file_type().is_dir()
        || metadata.uid() != unsafe { libc::geteuid() }
        || metadata.mode() & 0o777 != CONTROL_DIRECTORY_MODE
    {
        return Err("CLI socket directory must be a real directory owned by the current user with mode 0700".into());
    }

    return Ok(());
}

// Note: Restrict access to the owner because CLI requests can change app state
const CONTROL_DIRECTORY_MODE: u32 = 0o700;
