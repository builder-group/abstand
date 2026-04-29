/// Lists the curated services included in the predefined catalog.
pub const PREDEFINED_SERVICES: &[PredefinedService] = &[
    PredefinedService {
        name: "YouTube",
        domains: &["youtube.com", "youtu.be", "youtube-nocookie.com"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Instagram",
        domains: &["instagram.com"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Reddit",
        domains: &["reddit.com", "redd.it"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "X",
        domains: &["x.com", "twitter.com", "t.co"],
        aliases: &["twitter"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "ChatGPT",
        domains: &["chatgpt.com"],
        aliases: &["openai", "gpt"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Claude",
        domains: &["claude.ai"],
        aliases: &["anthropic"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Gemini",
        domains: &["gemini.google.com"],
        aliases: &["google ai"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Notion",
        domains: &["notion.so", "notion.com"],
        aliases: &[],
        bundle_ids: &["notion.id"],
    },
    PredefinedService {
        name: "Slack",
        domains: &["slack.com", "app.slack.com"],
        aliases: &[],
        bundle_ids: &["com.tinyspeck.slackmacgap"],
    },
    PredefinedService {
        name: "Discord",
        domains: &["discord.com", "discord.gg"],
        aliases: &[],
        bundle_ids: &["com.hnc.Discord"],
    },
    PredefinedService {
        name: "Gmail",
        domains: &["gmail.com", "mail.google.com"],
        aliases: &["google mail"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Google Drive",
        domains: &["drive.google.com"],
        aliases: &["gdrive"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Amazon",
        domains: &["amazon.de", "amazon.com"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Kleinanzeigen",
        domains: &["kleinanzeigen.de"],
        aliases: &["ebay kleinanzeigen"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "CoinMarketCap",
        domains: &["coinmarketcap.com"],
        aliases: &["crypto prices"],
        bundle_ids: &[],
    },
];

pub struct PredefinedService {
    pub name: &'static str,
    pub domains: &'static [&'static str],
    pub aliases: &'static [&'static str],
    pub bundle_ids: &'static [&'static str],
}
