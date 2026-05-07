use super::search::SearchableItem;
use nucleo_matcher::pattern::{CaseMatching, Normalization, Pattern};
use nucleo_matcher::{Config, Matcher, Utf32Str};
use std::borrow::Borrow;

/// Matches searchable catalog items against a query.
pub fn fuzzy_match<R>(items: impl IntoIterator<Item = R>, query: &str) -> Vec<(R, u32)>
where
    R: Borrow<SearchableItem>,
{
    let mut matcher = Matcher::new(Config::DEFAULT);
    let pattern = Pattern::parse(query, CaseMatching::Ignore, Normalization::Smart);
    let query_lower = query.to_lowercase();

    let mut results = Vec::new();
    for item in items {
        let score = get_item_score(&mut matcher, &pattern, &query_lower, item.borrow());
        if score > 0 {
            results.push((item, score));
        }
    }

    results.sort_by(|a, b| b.1.cmp(&a.1));
    return results;
}

fn get_item_score(
    matcher: &mut Matcher,
    pattern: &Pattern,
    query_lower: &str,
    item: &SearchableItem,
) -> u32 {
    let mut best_score = 0;
    let name = item.name();

    // Favor display-name matches over raw keywords so direct app or service names surface first
    if let Some(score) = match_str(matcher, pattern, name) {
        let mut name_score = (score as f32 * 1.5) as u32;
        if name.to_lowercase().starts_with(query_lower) {
            name_score = (name_score as f32 * 1.25) as u32;
        }

        best_score = best_score.max(name_score);
    }

    for keyword in item.keywords() {
        if let Some(score) = match_str(matcher, pattern, keyword) {
            best_score = best_score.max(score);
        }
    }

    return best_score;
}

/// Scores a string against a parsed fuzzy pattern.
fn match_str(matcher: &mut Matcher, pattern: &Pattern, haystack: &str) -> Option<u32> {
    let mut buffer = Vec::new();
    let haystack_utf32 = Utf32Str::new(haystack, &mut buffer);

    return pattern.score(haystack_utf32, matcher);
}

#[cfg(test)]
mod tests {
    use super::*;

    fn app(name: &str, bundle_id: &str) -> SearchableItem {
        return SearchableItem::app(
            bundle_id.to_string(),
            Some(bundle_id.to_string()),
            Some(name.to_string()),
        );
    }

    fn website(name: &str, hostname: &str) -> SearchableItem {
        return SearchableItem::website(
            hostname.to_string(),
            Some(name.to_string()),
            vec![hostname.to_string()],
        );
    }

    #[test]
    fn matches_exact_app_name() {
        let items = vec![
            app("Chrome", "com.google.Chrome"),
            app("Safari", "com.apple.Safari"),
        ];

        let results = fuzzy_match(items.iter(), "chrome");

        assert_eq!(results[0].0.name(), "Chrome");
    }

    #[test]
    fn matches_app_name_prefix() {
        let items = vec![
            app("Chrome", "com.google.Chrome"),
            app("Chromium", "org.chromium.Chromium"),
        ];

        let results = fuzzy_match(items.iter(), "chr");

        assert_eq!(results[0].0.name(), "Chrome");
    }

    #[test]
    fn matches_app_name_fuzzily() {
        let items = vec![
            app("Visual Studio Code", "com.microsoft.VSCode"),
            app("Xcode", "com.apple.dt.Xcode"),
        ];

        let results = fuzzy_match(items.iter(), "vsc");

        assert_eq!(results[0].0.name(), "Visual Studio Code");
    }

    #[test]
    fn matches_bundle_id_keyword() {
        let items = vec![app("Safari", "com.apple.Safari")];

        let results = fuzzy_match(items.iter(), "apple.safari");

        assert_eq!(results[0].0.name(), "Safari");
    }

    #[test]
    fn matches_website_hostname_keyword() {
        let items = vec![website("Notion", "notion.so")];

        let results = fuzzy_match(items.iter(), "notion.so");

        assert_eq!(results[0].0.name(), "Notion");
    }

    #[test]
    fn ranks_tighter_matches_higher() {
        let items = vec![
            app("Chrome", "com.google.Chrome"),
            app("Chrome Canary", "com.google.Chrome.canary"),
            app("Chromium", "org.chromium.Chromium"),
        ];

        let results = fuzzy_match(items.iter(), "chrome");

        assert_eq!(results[0].0.name(), "Chrome");
    }

    #[test]
    fn returns_no_matches_for_unrelated_query() {
        let items = vec![
            app("Chrome", "com.google.Chrome"),
            app("Safari", "com.apple.Safari"),
        ];

        let results = fuzzy_match(items.iter(), "zzzzz");

        assert!(results.is_empty());
    }
}
