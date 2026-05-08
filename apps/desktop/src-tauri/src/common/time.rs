// Note: Keep these primitives app-owned instead of exposing chrono types directly.
// Chrono provides parsing, validation, and evaluation helpers, but our DB/API contract owns the serialized tokens:
// "YYYY-MM-DD" for DateOnly, "HH:MM" for TimeOnly, and "mon".."sun" for Weekday

use chrono::{
    DateTime, Local, LocalResult, NaiveDate, NaiveTime, TimeZone, Weekday as ChronoWeekday,
};
use serde::{de, Deserialize, Deserializer, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, specta::Type)]
#[serde(transparent)]
#[specta(transparent)]
pub struct DateOnly(String);

impl DateOnly {
    pub fn parse(value: &str) -> Result<Self, String> {
        let value = value.trim();
        let Ok(date) = NaiveDate::parse_from_str(value, "%Y-%m-%d") else {
            return Err(format!("Invalid date-only value: {}", value));
        };
        if date.format("%Y-%m-%d").to_string() != value {
            return Err(format!("Invalid date-only value: {}", value));
        }

        return Ok(Self(value.to_string()));
    }

    pub fn as_str(&self) -> &str {
        return &self.0;
    }

    fn to_naive_date(&self) -> NaiveDate {
        return NaiveDate::parse_from_str(&self.0, "%Y-%m-%d")
            .expect("DateOnly should always contain a valid date");
    }
}

impl<'de> Deserialize<'de> for DateOnly {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = String::deserialize(deserializer)?;
        return Self::parse(&value).map_err(de::Error::custom);
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, specta::Type)]
#[serde(transparent)]
#[specta(transparent)]
pub struct TimeOnly(String);

impl TimeOnly {
    pub fn parse(value: &str) -> Result<Self, String> {
        let value = value.trim();
        let Ok(time) = NaiveTime::parse_from_str(value, "%H:%M") else {
            return Err(format!("Invalid time-only value: {}", value));
        };
        if time.format("%H:%M").to_string() != value {
            return Err(format!("Invalid time-only value: {}", value));
        }

        return Ok(Self(value.to_string()));
    }

    pub fn as_str(&self) -> &str {
        return &self.0;
    }

    fn to_naive_time(&self) -> NaiveTime {
        return NaiveTime::parse_from_str(&self.0, "%H:%M")
            .expect("TimeOnly should always contain a valid time");
    }
}

impl<'de> Deserialize<'de> for TimeOnly {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = String::deserialize(deserializer)?;
        return Self::parse(&value).map_err(de::Error::custom);
    }
}

pub fn to_local_datetime(date: &DateOnly, time: &TimeOnly) -> Result<DateTime<Local>, String> {
    let naive_datetime = date.to_naive_date().and_time(time.to_naive_time());

    return match Local.from_local_datetime(&naive_datetime) {
        LocalResult::Single(datetime) => Ok(datetime),
        LocalResult::Ambiguous(_, _) => Err(format!(
            "Ambiguous local date-time: {} {}",
            date.as_str(),
            time.as_str()
        )),
        LocalResult::None => Err(format!(
            "Invalid local date-time: {} {}",
            date.as_str(),
            time.as_str()
        )),
    };
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum Weekday {
    Mon,
    Tue,
    Wed,
    Thu,
    Fri,
    Sat,
    Sun,
}

impl Weekday {
    pub const ALL: [Self; 7] = [
        Self::Mon,
        Self::Tue,
        Self::Wed,
        Self::Thu,
        Self::Fri,
        Self::Sat,
        Self::Sun,
    ];

    pub fn as_str(&self) -> &'static str {
        return match self {
            Self::Mon => "mon",
            Self::Tue => "tue",
            Self::Wed => "wed",
            Self::Thu => "thu",
            Self::Fri => "fri",
            Self::Sat => "sat",
            Self::Sun => "sun",
        };
    }

    pub fn from_str(value: &str) -> Result<Self, String> {
        return match value {
            "mon" => Ok(Self::Mon),
            "tue" => Ok(Self::Tue),
            "wed" => Ok(Self::Wed),
            "thu" => Ok(Self::Thu),
            "fri" => Ok(Self::Fri),
            "sat" => Ok(Self::Sat),
            "sun" => Ok(Self::Sun),
            _ => Err(format!("Unknown weekday: {}", value)),
        };
    }
}

impl From<Weekday> for ChronoWeekday {
    fn from(value: Weekday) -> Self {
        return match value {
            Weekday::Mon => Self::Mon,
            Weekday::Tue => Self::Tue,
            Weekday::Wed => Self::Wed,
            Weekday::Thu => Self::Thu,
            Weekday::Fri => Self::Fri,
            Weekday::Sat => Self::Sat,
            Weekday::Sun => Self::Sun,
        };
    }
}

impl From<ChronoWeekday> for Weekday {
    fn from(value: ChronoWeekday) -> Self {
        return match value {
            ChronoWeekday::Mon => Self::Mon,
            ChronoWeekday::Tue => Self::Tue,
            ChronoWeekday::Wed => Self::Wed,
            ChronoWeekday::Thu => Self::Thu,
            ChronoWeekday::Fri => Self::Fri,
            ChronoWeekday::Sat => Self::Sat,
            ChronoWeekday::Sun => Self::Sun,
        };
    }
}

#[cfg(test)]
mod tests {
    use super::{to_local_datetime, DateOnly, TimeOnly, Weekday};
    use chrono::Weekday as ChronoWeekday;

    #[test]
    fn validates_canonical_date_only_values() {
        assert!(DateOnly::parse("2026-05-08").is_ok());
        assert!(DateOnly::parse("2024-02-29").is_ok());

        assert!(DateOnly::parse("2024-02-30").is_err());
        assert!(DateOnly::parse("2026-5-08").is_err());
        assert!(DateOnly::parse("2026-13-08").is_err());
    }

    #[test]
    fn date_only_rejects_timezone_values() {
        assert!(DateOnly::parse("2026-05-08T09:00:00Z").is_err());
        assert!(DateOnly::parse("2026-05-08+02:00").is_err());
    }

    #[test]
    fn date_only_serializes_as_string() {
        let date = DateOnly::parse("2026-05-08").unwrap();

        assert_eq!(date.as_str(), "2026-05-08");
        assert_eq!(serde_json::to_string(&date).unwrap(), "\"2026-05-08\"");
        assert!(serde_json::from_str::<DateOnly>("\"2026-05-08\"").is_ok());
        assert!(serde_json::from_str::<DateOnly>("\"2026-05-08T09:00:00Z\"").is_err());
    }

    #[test]
    fn validates_canonical_time_only_values() {
        assert!(TimeOnly::parse("00:00").is_ok());
        assert!(TimeOnly::parse("23:59").is_ok());

        assert!(TimeOnly::parse("24:00").is_err());
        assert!(TimeOnly::parse("09:60").is_err());
        assert!(TimeOnly::parse("9:00").is_err());
    }

    #[test]
    fn time_only_rejects_timezone_values() {
        assert!(TimeOnly::parse("09:00Z").is_err());
        assert!(TimeOnly::parse("09:00+02:00").is_err());
    }

    #[test]
    fn time_only_serializes_as_string() {
        let time = TimeOnly::parse("09:00").unwrap();

        assert_eq!(time.as_str(), "09:00");
        assert_eq!(serde_json::to_string(&time).unwrap(), "\"09:00\"");
        assert!(serde_json::from_str::<TimeOnly>("\"09:00\"").is_ok());
        assert!(serde_json::from_str::<TimeOnly>("\"09:00Z\"").is_err());
    }

    #[test]
    fn combines_date_and_time_in_local_timezone() {
        let date = DateOnly::parse("2026-05-08").unwrap();
        let time = TimeOnly::parse("09:30").unwrap();
        let datetime = to_local_datetime(&date, &time).unwrap();

        assert_eq!(datetime.format("%Y-%m-%d").to_string(), "2026-05-08");
        assert_eq!(datetime.format("%H:%M").to_string(), "09:30");
    }

    #[test]
    fn converts_to_chrono_weekday() {
        assert_eq!(ChronoWeekday::from(Weekday::Mon), ChronoWeekday::Mon);
        assert_eq!(ChronoWeekday::from(Weekday::Sun), ChronoWeekday::Sun);
    }

    #[test]
    fn converts_from_chrono_weekday() {
        assert_eq!(Weekday::from(ChronoWeekday::Mon), Weekday::Mon);
        assert_eq!(Weekday::from(ChronoWeekday::Sun), Weekday::Sun);
    }

    #[test]
    fn parses_weekday_tokens() {
        assert_eq!(Weekday::from_str("mon"), Ok(Weekday::Mon));
        assert_eq!(Weekday::from_str("sun"), Ok(Weekday::Sun));
        assert!(Weekday::from_str("monday").is_err());
    }

    #[test]
    fn serializes_weekday_tokens() {
        assert_eq!(serde_json::to_string(&Weekday::Mon).unwrap(), "\"mon\"");
        assert_eq!(serde_json::to_string(&Weekday::Sun).unwrap(), "\"sun\"");
    }

    #[test]
    fn exposes_canonical_monday_first_order() {
        assert_eq!(
            Weekday::ALL,
            [
                Weekday::Mon,
                Weekday::Tue,
                Weekday::Wed,
                Weekday::Thu,
                Weekday::Fri,
                Weekday::Sat,
                Weekday::Sun,
            ]
        );
    }
}
