/// Resolves the canonical app identity from native app metadata.
pub fn resolve_app_identity(bundle_id: &str, name: &str, path: &str) -> ResolvedAppIdentity {
    #[cfg(target_os = "macos")]
    {
        if let Some(bundle_id) = normalize_bundle_id(bundle_id) {
            return ResolvedAppIdentity {
                app_id: bundle_id.clone(),
                bundle_id: Some(bundle_id),
            };
        }
    }

    return ResolvedAppIdentity {
        app_id: build_path_based_app_id(name, path),
        bundle_id: None,
    };
}

pub struct ResolvedAppIdentity {
    pub app_id: String,
    pub bundle_id: Option<String>,
}

fn normalize_bundle_id(bundle_id: &str) -> Option<String> {
    let trimmed = bundle_id.trim();
    if trimmed.is_empty() {
        return None;
    }

    return Some(trimmed.to_string());
}

fn build_path_based_app_id(name: &str, path: &str) -> String {
    let slug = slugify_name_hint(name);
    let hash = hash_fnv1a64(path.as_bytes());

    return format!("local.path.{slug}.{hash:016x}");
}

fn slugify_name_hint(input: &str) -> String {
    let mut slug = String::with_capacity(input.len());
    let mut last_was_separator = false;

    for character in input.chars() {
        if character.is_ascii_alphanumeric() {
            slug.push(character.to_ascii_lowercase());
            last_was_separator = false;
            continue;
        }

        if !last_was_separator {
            slug.push('-');
            last_was_separator = true;
        }
    }

    while slug.ends_with('-') {
        slug.pop();
    }

    if slug.is_empty() {
        return "app".to_string();
    }

    return slug;
}

fn hash_fnv1a64(bytes: &[u8]) -> u64 {
    let mut hash = 0xcbf29ce484222325u64;

    for byte in bytes {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }

    return hash;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn uses_bundle_id_when_present() {
        let identity =
            resolve_app_identity("com.todesktop.cursor", "Cursor", "/Applications/Cursor.app");

        assert_eq!(identity.app_id, "com.todesktop.cursor");
        assert_eq!(identity.bundle_id.as_deref(), Some("com.todesktop.cursor"));
    }

    #[test]
    fn falls_back_to_a_stable_unbundled_id() {
        let identity = resolve_app_identity(
            "",
            "Abstand Dev",
            "/Users/benno/Library/Developer/Abstand Dev.app",
        );

        assert!(identity.app_id.starts_with("local.path.abstand-dev."));
        assert_eq!(identity.bundle_id, None);
    }

    #[test]
    fn fallback_id_is_stable_for_the_same_input() {
        let first = resolve_app_identity("", "Abstand Dev", "/tmp/abstand-dev").app_id;
        let second = resolve_app_identity("", "Abstand Dev", "/tmp/abstand-dev").app_id;

        assert_eq!(first, second);
    }
}
