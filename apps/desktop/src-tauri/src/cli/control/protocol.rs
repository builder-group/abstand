use crate::modules::intentions::{
    commands::CreateIntentionParams,
    intention::{Intention, IntentionSession},
};
use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Read, Write};

#[derive(Debug, Serialize, Deserialize)]
#[serde(
    tag = "command",
    rename_all = "camelCase",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum ControlRequest {
    Status,
    ListIntentions,
    GetIntention { intention_id: i64 },
    CreateIntention { params: CreateIntentionParams },
    StartIntention { intention_id: i64 },
    StopIntention { intention_id: i64 },
    DeleteIntention { intention_id: i64 },
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ControlResult {
    Status(ControlStatus),
    Intentions(Vec<Intention>),
    Intention(Intention),
    Session(IntentionSession),
    Deleted { deleted: i64 },
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ControlStatus {
    pub version: String,
    pub pid: u32,
    pub sessions: Vec<IntentionSession>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "status", rename_all = "camelCase")]
pub(super) enum ControlResponse {
    Ok { result: ControlResult },
    Error { message: String },
}

pub(super) fn write_frame(writer: &mut impl Write, value: &impl Serialize) -> Result<(), String> {
    let mut frame = serde_json::to_vec(value).map_err(|error| error.to_string())?;
    frame.push(b'\n');
    return writer.write_all(&frame).map_err(|error| error.to_string());
}

pub(super) fn read_frame(reader: &mut impl Read, limit: usize) -> Result<Vec<u8>, String> {
    let mut frame = Vec::new();
    BufReader::new(reader.take((limit + 1) as u64))
        .read_until(b'\n', &mut frame)
        .map_err(|error| error.to_string())?;
    if frame.len() > limit {
        return Err("CLI message exceeds size limit".into());
    }
    if frame.last() != Some(&b'\n') {
        return Err("Incomplete CLI message".into());
    }

    return Ok(frame);
}

pub(super) const MAX_REQUEST_BYTES: usize = 1024 * 1024;
pub(super) const MAX_RESPONSE_BYTES: usize = 16 * 1024 * 1024;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn frame_rejects_truncated_and_oversized_messages() {
        assert!(read_frame(&mut &b"{}"[..], 10).is_err());
        assert!(read_frame(&mut &b"123456\n"[..], 5).is_err());
        assert_eq!(read_frame(&mut &b"{}\n"[..], 3).unwrap(), b"{}\n");
    }

    #[test]
    fn request_rejects_unknown_commands_and_fields() {
        let valid = serde_json::json!({ "command": "stopIntention", "intentionId": 1 });
        assert!(matches!(
            serde_json::from_value::<ControlRequest>(valid.clone()).unwrap(),
            ControlRequest::StopIntention { intention_id: 1 }
        ));
        assert_eq!(
            serde_json::to_value(ControlRequest::StopIntention { intention_id: 1 }).unwrap(),
            valid
        );
        assert!(
            serde_json::from_str::<ControlRequest>(r#"{"command":"sql","query":"DELETE"}"#)
                .is_err()
        );
        assert!(serde_json::from_str::<ControlRequest>(
            r#"{"command":"stopIntention","intentionId":1,"force":true}"#
        )
        .is_err());
    }

    #[test]
    fn response_round_trip_preserves_errors_and_unicode() {
        let response = ControlResponse::Error {
            message: "Błąd sesji".into(),
        };
        let response = serde_json::to_vec(&response).unwrap();
        let response: ControlResponse = serde_json::from_slice(&response).unwrap();

        assert!(matches!(response, ControlResponse::Error { message } if message == "Błąd sesji"));
    }

    #[test]
    fn result_serializes_as_plain_command_output() {
        let result = serde_json::to_value(ControlResult::Deleted { deleted: 42 }).unwrap();

        assert_eq!(result, serde_json::json!({ "deleted": 42 }));
    }
}
