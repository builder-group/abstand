/// Lists the curated services included in the predefined catalog.
pub const PREDEFINED_SERVICES: &[PredefinedService] = &[
    // Social Media
    PredefinedService {
        name: "YouTube",
        hostnames: &["youtube.com", "youtu.be", "youtube-nocookie.com"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Facebook",
        hostnames: &["facebook.com", "fb.com", "messenger.com"],
        aliases: &["fb", "meta"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Instagram",
        hostnames: &["instagram.com"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "X",
        hostnames: &["x.com", "twitter.com", "t.co"],
        aliases: &["twitter"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "TikTok",
        hostnames: &["tiktok.com"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Reddit",
        hostnames: &["reddit.com", "redd.it"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "LinkedIn",
        hostnames: &["linkedin.com"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Pinterest",
        hostnames: &["pinterest.com", "pin.it"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Snapchat",
        hostnames: &["snapchat.com"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Threads",
        hostnames: &["threads.net"],
        aliases: &["meta threads"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Bluesky",
        hostnames: &["bsky.app", "bsky.social"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Discord",
        hostnames: &["discord.com", "discord.gg"],
        aliases: &[],
        bundle_ids: &["com.hnc.Discord"],
    },
    PredefinedService {
        name: "Twitch",
        hostnames: &["twitch.tv"],
        aliases: &[],
        bundle_ids: &[],
    },
    // Entertainment
    PredefinedService {
        name: "Netflix",
        hostnames: &["netflix.com"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Spotify",
        hostnames: &["spotify.com", "open.spotify.com"],
        aliases: &[],
        bundle_ids: &["com.spotify.client"],
    },
    PredefinedService {
        name: "Disney+",
        hostnames: &["disneyplus.com"],
        aliases: &["disney plus"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Amazon Prime Video",
        hostnames: &["primevideo.com"],
        aliases: &["prime video"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Max",
        hostnames: &["max.com", "hbomax.com"],
        aliases: &["hbo", "hbo max"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Apple TV+",
        hostnames: &["tv.apple.com"],
        aliases: &["apple tv"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Crunchyroll",
        hostnames: &["crunchyroll.com"],
        aliases: &["anime"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Vimeo",
        hostnames: &["vimeo.com"],
        aliases: &[],
        bundle_ids: &[],
    },
    // Gaming
    PredefinedService {
        name: "Steam",
        hostnames: &[
            "steampowered.com",
            "store.steampowered.com",
            "steamcommunity.com",
        ],
        aliases: &[],
        bundle_ids: &["com.valvesoftware.steam"],
    },
    PredefinedService {
        name: "Epic Games",
        hostnames: &["epicgames.com", "store.epicgames.com"],
        aliases: &[],
        bundle_ids: &[],
    },
    // News & Reading
    PredefinedService {
        name: "Hacker News",
        hostnames: &["news.ycombinator.com"],
        aliases: &["hn", "y combinator"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Medium",
        hostnames: &["medium.com"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Substack",
        hostnames: &["substack.com"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "BBC",
        hostnames: &["bbc.com", "bbc.co.uk"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "CNN",
        hostnames: &["cnn.com"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "The Guardian",
        hostnames: &["theguardian.com"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "New York Times",
        hostnames: &["nytimes.com"],
        aliases: &["nyt"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Spiegel Online",
        hostnames: &["spiegel.de"],
        aliases: &["der spiegel"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Wikipedia",
        hostnames: &["wikipedia.org"],
        aliases: &["wiki"],
        bundle_ids: &[],
    },
    // Shopping
    PredefinedService {
        name: "Amazon",
        hostnames: &["amazon.com", "amazon.de", "amazon.co.uk", "amzn.to"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "eBay",
        hostnames: &["ebay.com", "ebay.de", "ebay.co.uk"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Kleinanzeigen",
        hostnames: &["kleinanzeigen.de"],
        aliases: &["ebay kleinanzeigen"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Etsy",
        hostnames: &["etsy.com"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Zalando",
        hostnames: &["zalando.de", "zalando.com"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "AliExpress",
        hostnames: &["aliexpress.com"],
        aliases: &["alibaba"],
        bundle_ids: &[],
    },
    // Messaging & Communication
    PredefinedService {
        name: "WhatsApp",
        hostnames: &["web.whatsapp.com", "whatsapp.com"],
        aliases: &["wa"],
        bundle_ids: &["net.whatsapp.WhatsApp"],
    },
    PredefinedService {
        name: "Telegram",
        hostnames: &["telegram.org", "web.telegram.org"],
        aliases: &[],
        bundle_ids: &["ru.keepcoder.Telegram"],
    },
    PredefinedService {
        name: "Slack",
        hostnames: &["slack.com", "app.slack.com"],
        aliases: &[],
        bundle_ids: &["com.tinyspeck.slackmacgap"],
    },
    PredefinedService {
        name: "Zoom",
        hostnames: &["zoom.us"],
        aliases: &[],
        bundle_ids: &["us.zoom.xos"],
    },
    PredefinedService {
        name: "Microsoft Teams",
        hostnames: &["teams.microsoft.com"],
        aliases: &["ms teams"],
        bundle_ids: &["com.microsoft.teams2"],
    },
    PredefinedService {
        name: "Google Meet",
        hostnames: &["meet.google.com"],
        aliases: &[],
        bundle_ids: &[],
    },
    // AI
    PredefinedService {
        name: "ChatGPT",
        hostnames: &["chatgpt.com", "chat.openai.com"],
        aliases: &["openai", "gpt"],
        bundle_ids: &["com.openai.chat"],
    },
    PredefinedService {
        name: "Claude",
        hostnames: &["claude.ai"],
        aliases: &["anthropic"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Gemini",
        hostnames: &["gemini.google.com"],
        aliases: &["google ai", "bard"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Perplexity",
        hostnames: &["perplexity.ai"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Copilot",
        hostnames: &["copilot.microsoft.com"],
        aliases: &["microsoft copilot", "bing ai"],
        bundle_ids: &[],
    },
    // Productivity
    PredefinedService {
        name: "Notion",
        hostnames: &["notion.so", "notion.com"],
        aliases: &[],
        bundle_ids: &["notion.id"],
    },
    PredefinedService {
        name: "Figma",
        hostnames: &["figma.com"],
        aliases: &[],
        bundle_ids: &["com.figma.Desktop"],
    },
    PredefinedService {
        name: "Linear",
        hostnames: &["linear.app"],
        aliases: &[],
        bundle_ids: &["com.linear"],
    },
    PredefinedService {
        name: "GitHub",
        hostnames: &["github.com", "gist.github.com"],
        aliases: &[],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Gmail",
        hostnames: &["mail.google.com", "gmail.com"],
        aliases: &["google mail"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Outlook",
        hostnames: &["outlook.com", "outlook.live.com"],
        aliases: &["microsoft mail"],
        bundle_ids: &[],
    },
    // Crypto
    PredefinedService {
        name: "CoinMarketCap",
        hostnames: &["coinmarketcap.com"],
        aliases: &["crypto prices", "cmc"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "CoinGecko",
        hostnames: &["coingecko.com"],
        aliases: &["crypto prices"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Binance",
        hostnames: &["binance.com"],
        aliases: &["crypto exchange"],
        bundle_ids: &[],
    },
    PredefinedService {
        name: "Coinbase",
        hostnames: &["coinbase.com"],
        aliases: &["crypto exchange"],
        bundle_ids: &[],
    },
];

pub struct PredefinedService {
    pub name: &'static str,
    pub hostnames: &'static [&'static str],
    pub aliases: &'static [&'static str],
    pub bundle_ids: &'static [&'static str],
}
