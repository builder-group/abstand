use super::watchdog;
use std::sync::atomic::{AtomicBool, Ordering};

pub(super) const RUN_AGENT_ARG: &str = "--recovery-agent";
pub(super) const RELAUNCHED_BY_AGENT_ARG: &str = "--recovery-agent-relaunched";

/// Runs the recovery agent process when the current executable was launched for that mode.
///
/// Exits the process with status 1 if the recovery watchdog fails.
pub fn try_run_from_args() -> bool {
    if !std::env::args().any(|arg| arg == RUN_AGENT_ARG) {
        return false;
    }

    if let Err(error) = watchdog::run() {
        eprintln!("Recovery agent failed: {}", error);
        std::process::exit(1);
    }

    return true;
}

/// Returns `true` once when the current process was relaunched by the recovery agent.
pub fn consume_relaunched_by_agent_arg() -> bool {
    static DID_CONSUME: AtomicBool = AtomicBool::new(false);

    if DID_CONSUME.swap(true, Ordering::SeqCst) {
        return false;
    }

    return std::env::args().any(|arg| arg == RELAUNCHED_BY_AGENT_ARG);
}
