use chrono::{DateTime, Datelike, Local, TimeZone};

pub fn format_display_time(timestamp_ms: i64) -> String {
    let Some(datetime) = Local.timestamp_millis_opt(timestamp_ms).single() else {
        return "--:--".to_string();
    };

    return format_local_display_time(&datetime);
}

pub fn format_relative_display_datetime(
    timestamp_ms: i64,
    reference_datetime: &DateTime<Local>,
) -> String {
    let Some(datetime) = Local.timestamp_millis_opt(timestamp_ms).single() else {
        return "--:--".to_string();
    };

    let day_delta = datetime
        .date_naive()
        .signed_duration_since(reference_datetime.date_naive())
        .num_days();
    let time = format_local_display_time(&datetime);

    if day_delta == 0 {
        return time;
    }

    if day_delta == 1 {
        return format!("tomorrow, {}", time);
    }

    if day_delta == -1 {
        return format!("yesterday, {}", time);
    }

    let date = if datetime.year() == reference_datetime.year() {
        datetime.format("%b %-e").to_string()
    } else {
        datetime.format("%b %-e, %Y").to_string()
    };
    return format!("{}, {}", date, time);
}

fn format_local_display_time(datetime: &DateTime<Local>) -> String {
    return datetime.format("%-I:%M %p").to_string();
}
