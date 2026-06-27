//! Manages the recovery agent that reopens Abstand during active Strict Enforcement.

pub mod agent;
pub mod commands;
mod recovery_condition;
mod user_launch_agent;
mod watchdog;

use std::error::Error;

pub fn run_watchdog() -> Result<(), Box<dyn Error>> {
    return watchdog::run();
}
