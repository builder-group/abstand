//! Manages the recovery agent that reopens Abstand during active Strict Enforcement.

pub mod agent;
pub mod cli;
pub mod commands;
mod recovery_condition;
mod user_launch_agent;
mod watchdog;
