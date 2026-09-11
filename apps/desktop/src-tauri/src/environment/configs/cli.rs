use crate::environment::path::get_home_dir;
use std::{error::Error, path::PathBuf};

pub struct CliConfig;

impl CliConfig {
    pub fn command_name() -> &'static str {
        if cfg!(debug_assertions) {
            return "abs-dev";
        }
        return "abs";
    }

    pub fn bin_dir() -> Result<PathBuf, Box<dyn Error>> {
        return Ok(get_home_dir()?.join(".local").join("bin"));
    }

    pub fn bin_path() -> Result<PathBuf, Box<dyn Error>> {
        return Ok(Self::bin_dir()?.join(Self::command_name()));
    }
}
