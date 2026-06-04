pub(super) const LAUNCHED_AT_LOGIN_ARG: &str = "--launched-at-login";

pub fn was_launched_at_login() -> bool {
    return std::env::args().any(|arg| arg == LAUNCHED_AT_LOGIN_ARG);
}
