/// Lists the curated services included in the predefined catalog.
pub const PREDEFINED_SERVICES: &[PredefinedService] = &[
    // Social Media
    PredefinedService {
        name: "YouTube",
        domains: &["youtube.com", "youtu.be", "youtube-nocookie.com"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Facebook",
        domains: &["facebook.com", "fb.com", "messenger.com"],
        aliases: &["fb", "meta"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Instagram",
        domains: &["instagram.com"],
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
        name: "TikTok",
        domains: &["tiktok.com"],
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
        name: "LinkedIn",
        domains: &["linkedin.com"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Pinterest",
        domains: &["pinterest.com", "pin.it"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Snapchat",
        domains: &["snapchat.com"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Threads",
        domains: &["threads.net"],
        aliases: &["meta threads"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Bluesky",
        domains: &["bsky.app", "bsky.social"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Discord",
        domains: &["discord.com", "discord.gg"],
        aliases: &[],
        bundle_ids: &["com.hnc.Discord"],
    },
    PredefinedService {
        name: "Twitch",
        domains: &["twitch.tv"],
        aliases: &[],
        bundle_ids: &[],
    },
    // Entertainment
    PredefinedService {
        name: "Netflix",
        domains: &["netflix.com"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Spotify",
        domains: &["spotify.com", "open.spotify.com"],
        aliases: &[],
        bundle_ids: &["com.spotify.client"],
    },
    PredefinedService {
        name: "Disney+",
        domains: &["disneyplus.com"],
        aliases: &["disney plus"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Amazon Prime Video",
        domains: &["primevideo.com"],
        aliases: &["prime video"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Max",
        domains: &["max.com", "hbomax.com"],
        aliases: &["hbo", "hbo max"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Apple TV+",
        domains: &["tv.apple.com"],
        aliases: &["apple tv"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Crunchyroll",
        domains: &["crunchyroll.com"],
        aliases: &["anime"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Vimeo",
        domains: &["vimeo.com"],
        aliases: &[],
        bundle_ids: &[],
    },
    // Gaming
    PredefinedService {
        name: "Steam",
        domains: &[
            "steampowered.com",
            "store.steampowered.com",
            "steamcommunity.com",
        ],
        aliases: &[],
        bundle_ids: &["com.valvesoftware.steam"],
    },
    PredefinedService {
        name: "Epic Games",
        domains: &["epicgames.com", "store.epicgames.com"],
        aliases: &[],
        bundle_ids: &[],
    },
    // News & Reading
    PredefinedService {
        name: "Hacker News",
        domains: &["news.ycombinator.com"],
        aliases: &["hn", "y combinator"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Medium",
        domains: &["medium.com"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Substack",
        domains: &["substack.com"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "BBC",
        domains: &["bbc.com", "bbc.co.uk"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "CNN",
        domains: &["cnn.com"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "The Guardian",
        domains: &["theguardian.com"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "New York Times",
        domains: &["nytimes.com"],
        aliases: &["nyt"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Spiegel Online",
        domains: &["spiegel.de"],
        aliases: &["der spiegel"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Wikipedia",
        domains: &["wikipedia.org"],
        aliases: &["wiki"],
        bundle_ids: &[],
    },
    // Shopping
    PredefinedService {
        name: "Amazon",
        domains: &["amazon.com", "amazon.de", "amazon.co.uk", "amzn.to"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "eBay",
        domains: &["ebay.com", "ebay.de", "ebay.co.uk"],
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
        name: "Etsy",
        domains: &["etsy.com"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Zalando",
        domains: &["zalando.de", "zalando.com"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "AliExpress",
        domains: &["aliexpress.com"],
        aliases: &["alibaba"],
        bundle_ids: &[],
    },
    // Messaging & Communication
    PredefinedService {
        name: "WhatsApp",
        domains: &["web.whatsapp.com", "whatsapp.com"],
        aliases: &["wa"],
        bundle_ids: &["net.whatsapp.WhatsApp"],
    },
    PredefinedService {
        name: "Telegram",
        domains: &["telegram.org", "web.telegram.org"],
        aliases: &[],
        bundle_ids: &["ru.keepcoder.Telegram"],
    },
    PredefinedService {
        name: "Slack",
        domains: &["slack.com", "app.slack.com"],
        aliases: &[],
        bundle_ids: &["com.tinyspeck.slackmacgap"],
    },
    PredefinedService {
        name: "Zoom",
        domains: &["zoom.us"],
        aliases: &[],
        bundle_ids: &["us.zoom.xos"],
    },
    PredefinedService {
        name: "Microsoft Teams",
        domains: &["teams.microsoft.com"],
        aliases: &["ms teams"],
        bundle_ids: &["com.microsoft.teams2"],
    },
    PredefinedService {
        name: "Google Meet",
        domains: &["meet.google.com"],
        aliases: &[],
        bundle_ids: &[],
    },
    // AI
    PredefinedService {
        name: "ChatGPT",
        domains: &["chatgpt.com", "chat.openai.com"],
        aliases: &["openai", "gpt"],
        bundle_ids: &["com.openai.chat"],
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
        aliases: &["google ai", "bard"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Perplexity",
        domains: &["perplexity.ai"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Copilot",
        domains: &["copilot.microsoft.com"],
        aliases: &["microsoft copilot", "bing ai"],
        bundle_ids: &[],
    },
    // Productivity
    PredefinedService {
        name: "Notion",
        domains: &["notion.so", "notion.com"],
        aliases: &[],
        bundle_ids: &["notion.id"],
    },
    PredefinedService {
        name: "Figma",
        domains: &["figma.com"],
        aliases: &[],
        bundle_ids: &["com.figma.Desktop"],
    },
    PredefinedService {
        name: "Linear",
        domains: &["linear.app"],
        aliases: &[],
        bundle_ids: &["com.linear"],
    },
    PredefinedService {
        name: "GitHub",
        domains: &["github.com", "gist.github.com"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Gmail",
        domains: &["mail.google.com", "gmail.com"],
        aliases: &["google mail"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Outlook",
        domains: &["outlook.com", "outlook.live.com"],
        aliases: &["microsoft mail"],
        bundle_ids: &[],
    },
    // Crypto
    PredefinedService {
        name: "CoinMarketCap",
        domains: &["coinmarketcap.com"],
        aliases: &["crypto prices", "cmc"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "CoinGecko",
        domains: &["coingecko.com"],
        aliases: &["crypto prices"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Binance",
        domains: &["binance.com"],
        aliases: &["crypto exchange"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Coinbase",
        domains: &["coinbase.com"],
        aliases: &["crypto exchange"],
        bundle_ids: &[],
    },
];

pub struct PredefinedService {
    pub name: &'static str,
    pub domains: &'static [&'static str],
    pub aliases: &'static [&'static str],
    pub bundle_ids: &'static [&'static str],
}
