// Note: Keep these primitives app-owned instead of exposing chrono types directly.
// Chrono provides parsing, validation, and evaluation helpers, but our DB/API contract owns the serialized scalars:
// epoch days for DateOnly, milliseconds since local midnight for TimeOnly, and weekday bitmasks for WeekdayMask.

use chrono::{DateTime, Local, LocalResult, NaiveDate, NaiveTime, TimeZone, Weekday};
use serde::{de, Deserialize, Deserializer, Serialize};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, specta::Type)]
#[serde(transparent)]
#[specta(transparent)]
pub struct DateOnly(i32);

impl DateOnly {
    pub fn from_epoch_days(value: i32) -> Result<Self, String> {
        if !(DATE_EPOCH_DAYS_MIN..=DATE_EPOCH_DAYS_MAX).contains(&value) {
            return Err(format!("Invalid date-only epoch days: {}", value));
        }

        return Ok(Self(value));
    }

    pub fn as_epoch_days(&self) -> i32 {
        return self.0;
    }

    fn to_naive_date(&self) -> NaiveDate {
        return NaiveDate::from_epoch_days(self.0)
            .expect("DateOnly should always contain a valid date");
    }
}

impl<'de> Deserialize<'de> for DateOnly {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = i32::deserialize(deserializer)?;
        return Self::from_epoch_days(value).map_err(de::Error::custom);
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, specta::Type)]
#[serde(transparent)]
#[specta(transparent)]
pub struct TimeOnly(i32);

impl TimeOnly {
    pub fn from_millis_since_midnight(value: i32) -> Result<Self, String> {
        if !(0..MILLIS_PER_DAY).contains(&value) {
            return Err(format!("Invalid time-only milliseconds: {}", value));
        }

        return Ok(Self(value));
    }

    pub fn as_millis_since_midnight(&self) -> i32 {
        return self.0;
    }

    pub fn to_naive_time(&self) -> NaiveTime {
        let seconds = self.0 / MILLIS_PER_SECOND;
        let nanos = (self.0 % MILLIS_PER_SECOND) as u32 * NANOS_PER_MILLI;

        return NaiveTime::from_num_seconds_from_midnight_opt(seconds as u32, nanos)
            .expect("TimeOnly should always contain a valid time");
    }
}

impl<'de> Deserialize<'de> for TimeOnly {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = i32::deserialize(deserializer)?;
        return Self::from_millis_since_midnight(value).map_err(de::Error::custom);
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, specta::Type)]
#[serde(transparent)]
#[specta(transparent)]
pub struct WeekdayMask(i32);

impl WeekdayMask {
    pub fn from_bits(value: i32) -> Result<Self, String> {
        if !(WEEKDAY_MASK_MIN..=WEEKDAY_MASK_MAX).contains(&value) {
            return Err(format!("Invalid weekday mask: {}", value));
        }

        return Ok(Self(value));
    }

    pub fn as_bits(&self) -> i32 {
        return self.0;
    }

    pub fn contains_weekday(&self, weekday: Weekday) -> bool {
        let bit = weekday.num_days_from_monday();
        return self.0 & (1 << bit) != 0;
    }
}

impl<'de> Deserialize<'de> for WeekdayMask {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = i32::deserialize(deserializer)?;
        return Self::from_bits(value).map_err(de::Error::custom);
    }
}

pub fn to_local_datetime(date: &DateOnly, time: &TimeOnly) -> Result<DateTime<Local>, String> {
    let naive_date = date.to_naive_date();
    let naive_time = time.to_naive_time();
    let naive_datetime = naive_date.and_time(naive_time);

    return match Local.from_local_datetime(&naive_datetime) {
        LocalResult::Single(datetime) => Ok(datetime),
        LocalResult::Ambiguous(_, _) => Err(format!(
            "Ambiguous local date-time: {} {}",
            naive_date.format("%Y-%m-%d"),
            naive_time.format("%H:%M:%S%.3f")
        )),
        LocalResult::None => Err(format!(
            "Invalid local date-time: {} {}",
            naive_date.format("%Y-%m-%d"),
            naive_time.format("%H:%M:%S%.3f")
        )),
    };
}

pub fn local_datetime_from_unix_ms(unix_ms: i64) -> Option<DateTime<Local>> {
    return match Local.timestamp_millis_opt(unix_ms) {
        LocalResult::Single(datetime) => Some(datetime),
        LocalResult::Ambiguous(datetime, _) => Some(datetime),
        LocalResult::None => None,
    };
}

pub fn local_unix_ms_from_date_and_time(date: NaiveDate, time: &TimeOnly) -> Option<i64> {
    let time = time.to_naive_time();
    let naive_datetime = date.and_time(time);

    return match Local.from_local_datetime(&naive_datetime) {
        LocalResult::Single(datetime) => Some(datetime.timestamp_millis()),
        LocalResult::Ambiguous(earliest, _) => Some(earliest.timestamp_millis()),
        LocalResult::None => None,
    };
}

pub fn unix_ms_now() -> i64 {
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or(Duration::ZERO);

    return duration.as_millis() as i64;
}

const MILLIS_PER_SECOND: i32 = 1_000;
const MILLIS_PER_DAY: i32 = 24 * 60 * 60 * MILLIS_PER_SECOND;
const NANOS_PER_MILLI: u32 = 1_000_000;

const DATE_EPOCH_DAYS_MIN: i32 = -719_162;
const DATE_EPOCH_DAYS_MAX: i32 = 2_932_896;

const WEEKDAY_MASK_MIN: i32 = 1;
const WEEKDAY_MASK_MAX: i32 = 0b111_1111;

#[cfg(test)]
mod tests {
    use super::{to_local_datetime, DateOnly, TimeOnly, WeekdayMask};
    use chrono::Weekday;

    #[test]
    fn date_only_epoch_day_zero_is_1970_01_01() {
        let date = DateOnly::from_epoch_days(0).unwrap();
        let time = TimeOnly::from_millis_since_midnight(0).unwrap();
        let datetime = to_local_datetime(&date, &time).unwrap();
        assert_eq!(datetime.format("%Y-%m-%d").to_string(), "1970-01-01");
    }

    #[test]
    fn validates_date_only_epoch_days() {
        assert_eq!(DateOnly::from_epoch_days(0).unwrap().as_epoch_days(), 0);
        assert_eq!(DateOnly::from_epoch_days(1).unwrap().as_epoch_days(), 1);
        assert_eq!(DateOnly::from_epoch_days(-1).unwrap().as_epoch_days(), -1);
    }

    #[test]
    fn date_only_rejects_out_of_range_epoch_days() {
        assert!(DateOnly::from_epoch_days(-719_162).is_ok());
        assert!(DateOnly::from_epoch_days(2_932_896).is_ok());
        assert!(DateOnly::from_epoch_days(-719_163).is_err());
        assert!(DateOnly::from_epoch_days(2_932_897).is_err());
        assert!(DateOnly::from_epoch_days(100_000_000).is_err());
        assert!(DateOnly::from_epoch_days(-100_000_000).is_err());
    }

    #[test]
    fn date_only_serializes_as_epoch_days() {
        let date = DateOnly::from_epoch_days(20581).unwrap();

        assert_eq!(date.as_epoch_days(), 20581);
        assert_eq!(serde_json::to_string(&date).unwrap(), "20581");
        assert!(serde_json::from_str::<DateOnly>("20581").is_ok());
        assert!(serde_json::from_str::<DateOnly>("\"2026-05-08\"").is_err());
    }

    #[test]
    fn validates_time_only_milliseconds() {
        assert_eq!(
            TimeOnly::from_millis_since_midnight(0)
                .unwrap()
                .as_millis_since_midnight(),
            0
        );
        assert_eq!(
            TimeOnly::from_millis_since_midnight(86_399_999)
                .unwrap()
                .as_millis_since_midnight(),
            86_399_999
        );

        assert!(TimeOnly::from_millis_since_midnight(-1).is_err());
        assert!(TimeOnly::from_millis_since_midnight(86_400_000).is_err());
    }

    #[test]
    fn time_only_serializes_as_milliseconds() {
        let time = TimeOnly::from_millis_since_midnight(32_400_000).unwrap();

        assert_eq!(time.as_millis_since_midnight(), 32_400_000);
        assert_eq!(serde_json::to_string(&time).unwrap(), "32400000");
        assert!(serde_json::from_str::<TimeOnly>("32400000").is_ok());
        assert!(serde_json::from_str::<TimeOnly>("\"09:00\"").is_err());
    }

    #[test]
    fn combines_date_and_time_in_local_timezone() {
        let date = DateOnly::from_epoch_days(20581).unwrap();
        let time = TimeOnly::from_millis_since_midnight(34_200_000).unwrap();
        let datetime = to_local_datetime(&date, &time).unwrap();

        assert_eq!(datetime.format("%Y-%m-%d").to_string(), "2026-05-08");
        assert_eq!(datetime.format("%H:%M").to_string(), "09:30");
    }

    #[test]
    fn validates_weekday_mask_bits() {
        assert_eq!(WeekdayMask::from_bits(1).unwrap().as_bits(), 1);
        assert_eq!(WeekdayMask::from_bits(127).unwrap().as_bits(), 127);

        assert!(WeekdayMask::from_bits(0).is_err());
        assert!(WeekdayMask::from_bits(128).is_err());
    }

    #[test]
    fn weekday_mask_serializes_as_bits() {
        let mask = WeekdayMask::from_bits(31).unwrap();

        assert_eq!(serde_json::to_string(&mask).unwrap(), "31");
        assert!(serde_json::from_str::<WeekdayMask>("31").is_ok());
        assert!(serde_json::from_str::<WeekdayMask>("0").is_err());
        assert!(serde_json::from_str::<WeekdayMask>("[\"mon\"]").is_err());
    }

    #[test]
    fn weekday_mask_checks_chrono_weekdays() {
        let monday_only = WeekdayMask::from_bits(0b000_0001).unwrap();
        assert!(monday_only.contains_weekday(Weekday::Mon));
        assert!(!monday_only.contains_weekday(Weekday::Tue));

        let all_days = WeekdayMask::from_bits(0b111_1111).unwrap();
        assert!(all_days.contains_weekday(Weekday::Mon));
        assert!(all_days.contains_weekday(Weekday::Sun));
    }

    #[test]
    fn chrono_weekday_order_matches_mask_bits() {
        assert_eq!(Weekday::Mon.num_days_from_monday(), 0);
        assert_eq!(Weekday::Tue.num_days_from_monday(), 1);
        assert_eq!(Weekday::Wed.num_days_from_monday(), 2);
        assert_eq!(Weekday::Thu.num_days_from_monday(), 3);
        assert_eq!(Weekday::Fri.num_days_from_monday(), 4);
        assert_eq!(Weekday::Sat.num_days_from_monday(), 5);
        assert_eq!(Weekday::Sun.num_days_from_monday(), 6);
    }
}
