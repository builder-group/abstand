use std::{
    io,
    path::{Path, PathBuf},
};

/// Resolves a symlink target relative to the symlink path.
pub fn resolve_link_target(link_path: &Path, target: &Path) -> PathBuf {
    if target.is_absolute() {
        return target.to_path_buf();
    }

    return link_path
        .parent()
        .map(|parent| parent.join(target))
        .unwrap_or_else(|| target.to_path_buf());
}

/// Returns true when paths are lexically equal or canonicalize to the same path.
pub fn paths_equal(left: &Path, right: &Path) -> bool {
    if left == right {
        return true;
    }

    let left = left.canonicalize().ok();
    let right = right.canonicalize().ok();
    return left.is_some() && left == right;
}

/// Creates a symlink from `link` to `target`.
#[cfg(unix)]
pub fn create_symlink(target: &Path, link: &Path) -> io::Result<()> {
    return std::os::unix::fs::symlink(target, link);
}

/// Creates a symlink from `link` to `target`.
#[cfg(not(unix))]
pub fn create_symlink(_target: &Path, _link: &Path) -> io::Result<()> {
    return Err(io::Error::new(
        io::ErrorKind::Unsupported,
        "symlinks are only supported on Unix-like systems",
    ));
}

#[cfg(test)]
mod tests {
    use super::{paths_equal, resolve_link_target};
    use std::path::Path;

    #[test]
    fn resolves_absolute_link_targets_as_is() {
        assert_eq!(
            resolve_link_target(
                Path::new("/usr/local/bin/abs"),
                Path::new("/Applications/Abstand")
            ),
            Path::new("/Applications/Abstand")
        );
    }

    #[test]
    fn resolves_relative_link_targets_against_link_parent() {
        assert_eq!(
            resolve_link_target(Path::new("/usr/local/bin/abs"), Path::new("../Abstand")),
            Path::new("/usr/local/bin/../Abstand")
        );
    }

    #[test]
    fn treats_lexically_equal_missing_paths_as_equal() {
        assert!(paths_equal(
            Path::new("/definitely/missing/abstand"),
            Path::new("/definitely/missing/abstand")
        ));
    }

    #[test]
    fn treats_distinct_missing_paths_as_not_equal() {
        assert!(!paths_equal(
            Path::new("/definitely/missing/abstand-a"),
            Path::new("/definitely/missing/abstand-b")
        ));
    }
}
