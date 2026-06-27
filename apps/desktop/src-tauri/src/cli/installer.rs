use crate::{
    common::path::{create_symlink, paths_equal, resolve_link_target},
    environment::configs::cli::CliConfig,
};
use serde::Serialize;
use std::{env, error::Error, fs, path::PathBuf};

pub struct CliInstaller {
    bin_path: PathBuf,
    executable_path: PathBuf,
}

impl CliInstaller {
    pub fn for_current_app() -> Result<Self, Box<dyn Error>> {
        return Ok(Self {
            bin_path: CliConfig::bin_path()?,
            executable_path: env::current_exe()?,
        });
    }

    pub fn install(&self) -> Result<(), Box<dyn Error>> {
        if !self.executable_path.exists() {
            return Err(format!(
                "CLI executable does not exist: {}",
                self.executable_path.display()
            )
            .into());
        }

        if let Some(parent) = self.bin_path.parent() {
            fs::create_dir_all(parent)?;
        }

        match self.install_state() {
            CliInstallState::Conflict => {
                return Err(format!(
                    "CLI path already exists and is not managed by Abstand: {}",
                    self.bin_path.display()
                )
                .into());
            }
            CliInstallState::Installed => return Ok(()),
            CliInstallState::NotInstalled => {}
        }

        create_symlink(&self.executable_path, &self.bin_path)?;
        return Ok(());
    }

    pub fn uninstall(&self) -> Result<(), Box<dyn Error>> {
        match self.install_state() {
            CliInstallState::Conflict => {
                return Err(format!(
                    "CLI path already exists and is not managed by Abstand: {}",
                    self.bin_path.display()
                )
                .into());
            }
            CliInstallState::NotInstalled => return Ok(()),
            CliInstallState::Installed => {}
        }

        fs::remove_file(&self.bin_path)?;
        return Ok(());
    }

    pub fn status(&self) -> CliInstallStatus {
        return CliInstallStatus {
            state: self.install_state(),
            command_name: CliConfig::command_name().to_string(),
            bin_path: self.bin_path.to_string_lossy().to_string(),
            bin_dir: self.bin_dir().to_string_lossy().to_string(),
        };
    }

    fn install_state(&self) -> CliInstallState {
        if fs::symlink_metadata(&self.bin_path).is_err() {
            return CliInstallState::NotInstalled;
        }

        let installed_target_path = fs::read_link(&self.bin_path)
            .ok()
            .map(|target| resolve_link_target(&self.bin_path, &target));
        if installed_target_path
            .as_ref()
            .is_some_and(|target| paths_equal(target, &self.executable_path))
        {
            return CliInstallState::Installed;
        }

        return CliInstallState::Conflict;
    }

    fn bin_dir(&self) -> PathBuf {
        return self
            .bin_path
            .parent()
            .map(|path| path.to_path_buf())
            .unwrap_or_default();
    }
}

#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CliInstallStatus {
    pub state: CliInstallState,
    pub command_name: String,
    pub bin_path: String,
    pub bin_dir: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum CliInstallState {
    NotInstalled,
    Installed,
    Conflict,
}
