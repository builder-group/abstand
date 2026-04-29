/// Extracts a normalized domain from input.
pub fn extract_domain(input: &str) -> Option<String> {
    let trimmed = input.trim().to_lowercase();
    if trimmed.is_empty() {
        return None;
    }

    let has_explicit_authority = trimmed.contains("://") || trimmed.starts_with("//");

    // Peel away transport, path, query, and auth pieces until only the host remains
    let without_scheme = trimmed
        .split_once("://")
        .map(|(_, remainder)| remainder)
        .unwrap_or(trimmed.as_str())
        .trim_start_matches("//");
    let authority = without_scheme
        .split(['/', '?', '#'])
        .next()
        .unwrap_or_default();
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
        .trim_matches('.');

    if !is_domain_like(host) {
        return None;
    }

    return Some(host.to_string());
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
    use super::extract_domain;

    #[test]
    fn extracts_domains_from_urls() {
        assert_eq!(
            extract_domain("https://sub.example.com/path?query=1"),
            Some("sub.example.com".to_string())
        );
        assert_eq!(
            extract_domain("user:pass@example.com:8080"),
            Some("example.com".to_string())
        );
    }

    #[test]
    fn extracts_domains_without_a_scheme() {
        assert_eq!(
            extract_domain("docs.example.com/reference"),
            Some("docs.example.com".to_string())
        );
        assert_eq!(
            extract_domain("EXAMPLE.com"),
            Some("example.com".to_string())
        );
    }

    #[test]
    fn ignores_non_domains() {
        assert_eq!(extract_domain("about"), None);
        assert_eq!(extract_domain("localhost:3000"), None);
        assert_eq!(extract_domain("not a domain"), None);
        assert_eq!(extract_domain("benno@example.com"), None);
        assert_eq!(extract_domain("mailto:benno@example.com"), None);
    }
}
