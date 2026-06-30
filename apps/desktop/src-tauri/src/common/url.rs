/// Extracts a normalized website target from input.
pub fn extract_website_target(input: &str) -> Option<WebsiteTarget> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return None;
    }

    let has_explicit_authority = trimmed.contains("://") || trimmed.starts_with("//");

    // Peel away transport and auth pieces so host and path can be normalized separately
    let without_scheme = trimmed
        .split_once("://")
        .map(|(_, remainder)| remainder)
        .unwrap_or(trimmed)
        .trim_start_matches("//");
    let authority_end = without_scheme
        .find(['/', '?', '#'])
        .unwrap_or(without_scheme.len());
    let authority = &without_scheme[..authority_end];
    let host_with_optional_port = match authority.rsplit_once('@') {
        Some((credentials, host))
            if has_explicit_authority || looks_like_authority_credentials(credentials, host) =>
        {
            host.trim()
        }
        Some(_) => return None,
        None => authority.trim(),
    };

    if host_with_optional_port.is_empty() {
        return None;
    }

    let host = host_with_optional_port
        .split_once(':')
        .map(|(host, _)| host)
        .unwrap_or(host_with_optional_port)
        .trim_matches('.')
        .to_lowercase();

    if !is_domain_like(&host) {
        return None;
    }

    return Some(WebsiteTarget {
        hostname: host,
        path: extract_path(without_scheme, authority_end),
    });
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct WebsiteTarget {
    pub hostname: String,
    pub path: Option<String>,
}

/// Extracts a normalized hostname from input.
pub fn extract_hostname(input: &str) -> Option<String> {
    return extract_website_target(input).map(|target| target.hostname);
}

fn extract_path(without_scheme: &str, authority_end: usize) -> Option<String> {
    let remainder = &without_scheme[authority_end..];
    if !remainder.starts_with('/') {
        return None;
    }

    let path = remainder
        .split(['?', '#'])
        .next()
        .unwrap_or_default()
        .trim()
        .trim_end_matches('/');
    if path.is_empty() {
        return None;
    }

    return Some(path.to_string());
}

fn looks_like_authority_credentials(credentials: &str, host: &str) -> bool {
    return credentials.contains(':') && host.contains(':');
}

fn is_domain_like(value: &str) -> bool {
    if value.contains(' ') || !value.contains('.') {
        return false;
    }

    let mut labels = value.split('.');
    let mut label_count = 0;

    while let Some(label) = labels.next() {
        label_count += 1;

        if label.is_empty() {
            return false;
        }

        let starts_or_ends_with_dash = label.starts_with('-') || label.ends_with('-');
        if starts_or_ends_with_dash {
            return false;
        }

        if !label
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || character == '-')
        {
            return false;
        }
    }

    if label_count < 2 {
        return false;
    }

    let top_level_domain = value.rsplit('.').next().unwrap_or_default();

    return top_level_domain.len() >= 2
        && top_level_domain
            .chars()
            .all(|character| character.is_ascii_alphabetic());
}

#[cfg(test)]
mod tests {
    use super::{extract_hostname, extract_website_target};

    #[test]
    fn extracts_hostnames_from_urls() {
        assert_eq!(
            extract_hostname("https://sub.example.com/path?query=1"),
            Some("sub.example.com".to_string())
        );
        assert_eq!(
            extract_hostname("user:pass@example.com:8080"),
            Some("example.com".to_string())
        );
    }

    #[test]
    fn extracts_hostnames_without_a_scheme() {
        assert_eq!(
            extract_hostname("docs.example.com/reference"),
            Some("docs.example.com".to_string())
        );
        assert_eq!(
            extract_hostname("EXAMPLE.com"),
            Some("example.com".to_string())
        );
    }

    #[test]
    fn extracts_website_targets() {
        let target = extract_website_target("https://www.youtube.com/watch/?v=123").unwrap();
        assert_eq!(target.hostname, "www.youtube.com");
        assert_eq!(target.path, Some("/watch".to_string()));

        let target = extract_website_target("docs.example.com/reference/path#section").unwrap();
        assert_eq!(target.hostname, "docs.example.com");
        assert_eq!(target.path, Some("/reference/path".to_string()));

        let target = extract_website_target("EXAMPLE.com").unwrap();
        assert_eq!(target.hostname, "example.com");
        assert_eq!(target.path, None);
    }

    #[test]
    fn ignores_non_hostnames() {
        assert_eq!(extract_hostname("about"), None);
        assert_eq!(extract_hostname("localhost:3000"), None);
        assert_eq!(extract_hostname("not a domain"), None);
        assert_eq!(extract_hostname("benno@example.com"), None);
        assert_eq!(extract_hostname("mailto:benno@example.com"), None);
    }
}
