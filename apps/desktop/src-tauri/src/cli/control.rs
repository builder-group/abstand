//! Connects CLI requests to the running app through a private Unix socket.

use crate::{
    environment::{configs::app::AppConfig, path::get_app_support_dir},
    modules::{
        db::types::DatabaseState,
        intentions::{
            commands,
            intention::{IntentionBehavior, IntentionEnforcementMode},
            types::IntentionRuntimeState,
        },
    },
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    fs,
    io::{self, BufRead, BufReader, Read, Write},
    os::unix::{
        fs::{DirBuilderExt, FileTypeExt, PermissionsExt},
        net::{UnixListener, UnixStream},
    },
    path::PathBuf,
    time::Duration,
};
use tauri::{AppHandle, Manager};

pub fn setup(app: &AppHandle) -> Result<(), String> {
    let path = socket_path()?;
    let directory = path.parent().ok_or("CLI socket directory unavailable")?;
    match fs::symlink_metadata(directory) {
        Ok(metadata) if !metadata.file_type().is_dir() => {
            return Err("CLI socket directory must be a real directory".into());
        }
        Ok(_) => {}
        Err(error) if error.kind() == io::ErrorKind::NotFound => {
            fs::DirBuilder::new()
                .mode(0o700)
                .create(directory)
                .map_err(|e| e.to_string())?;
        }
        Err(error) => return Err(error.to_string()),
    }
    fs::set_permissions(directory, fs::Permissions::from_mode(0o700)).map_err(|e| e.to_string())?;

    if let Ok(metadata) = fs::symlink_metadata(&path) {
        if !metadata.file_type().is_socket() {
            return Err("Refusing to replace a non-socket CLI path".into());
        }
        match UnixStream::connect(&path) {
            Ok(_) => return Err("Another Abstand CLI server is already running".into()),
            Err(error) if error.kind() == io::ErrorKind::ConnectionRefused => {
                fs::remove_file(&path).map_err(|e| e.to_string())?;
            }
            Err(error) => return Err(error.to_string()),
        }
    }
    let listener = UnixListener::bind(&path).map_err(|e| e.to_string())?;
    fs::set_permissions(&path, fs::Permissions::from_mode(0o600)).map_err(|e| e.to_string())?;
    let app = app.clone();
    std::thread::Builder::new()
        .name("cli-control".into())
        .spawn(move || {
            for stream in listener.incoming() {
                match stream {
                    Ok(stream) => {
                        if let Err(error) = serve_connection(&app, stream) {
                            log::debug!("CLI connection ended: {}", error);
                        }
                    }
                    Err(error) => log::error!("CLI accept failed: {}", error),
                }
            }
        })
        .map_err(|e| e.to_string())?;
    return Ok(());
}

pub fn send(request: &ControlRequest) -> Result<Value, String> {
    let path = socket_path()?;
    let mut stream = UnixStream::connect(&path).map_err(|error| format!(
        "Cannot connect to Abstand: {}. Open the app built with CLI control, then retry. Socket: {}",
        error, path.display()
    ))?;
    stream
        .set_read_timeout(Some(Duration::from_secs(30)))
        .map_err(|e| e.to_string())?;
    stream
        .set_write_timeout(Some(Duration::from_secs(5)))
        .map_err(|e| e.to_string())?;
    write_frame(&mut stream, request)?;
    let response = read_frame(&mut stream, MAX_RESPONSE_BYTES).map_err(|error| format!(
        "CLI response unavailable: {}. The operation may have completed; check status before retrying a mutation.", error
    ))?;
    let response: ControlResponse = serde_json::from_slice(&response).map_err(|e| e.to_string())?;
    return match response {
        ControlResponse::Ok { result } => Ok(result),
        ControlResponse::Error { message } => Err(message),
    };
}

fn socket_path() -> Result<PathBuf, String> {
    return get_app_support_dir(AppConfig::bundle_identifier())
        .map(|path| path.join("cli").join("control.sock"))
        .map_err(|e| e.to_string());
}

fn serve_connection(app: &AppHandle, mut stream: UnixStream) -> Result<(), String> {
    stream
        .set_read_timeout(Some(Duration::from_secs(5)))
        .map_err(|e| e.to_string())?;
    stream
        .set_write_timeout(Some(Duration::from_secs(5)))
        .map_err(|e| e.to_string())?;
    let result = read_frame(&mut stream, MAX_REQUEST_BYTES)
        .and_then(|frame| {
            serde_json::from_slice::<ControlRequest>(&frame).map_err(|e| e.to_string())
        })
        .and_then(|request| tauri::async_runtime::block_on(dispatch(app, request)));
    let response = match result {
        Ok(result) => ControlResponse::Ok { result },
        Err(message) => ControlResponse::Error { message },
    };
    return write_frame(&mut stream, &response);
}

async fn dispatch(app: &AppHandle, request: ControlRequest) -> Result<Value, String> {
    let db = app.state::<DatabaseState>();
    let runtime = app.state::<IntentionRuntimeState>();
    match request {
        ControlRequest::List => return to_value(commands::get_intentions(db).await?),
        ControlRequest::Status => {
            return Ok(json!({
                "version": AppConfig::display_version(),
                "pid": std::process::id(),
                "sessions": commands::get_active_intention_sessions(db).await?,
            }))
        }
        ControlRequest::Show { id } => {
            let intention = commands::get_intention(db, id)
                .await?
                .ok_or_else(|| format!("Intention {} does not exist", id))?;
            return to_value(intention);
        }
        ControlRequest::Create { params } => {
            let params = serde_json::from_value(params).map_err(|e| e.to_string())?;
            return to_value(commands::create_intention(app.clone(), db, runtime, params).await?);
        }
        ControlRequest::Update { params } => {
            let params: commands::UpdateIntentionParams =
                serde_json::from_value(params).map_err(|e| e.to_string())?;
            if let Some(assessment) =
                commands::assess_intention_edit_policy(db.clone(), params.clone()).await?
            {
                if matches!(assessment, crate::modules::intentions::edit_policy::IntentionEditPolicyAssessment::Delayed { .. }) {
                    return Err("Updating this active Balanced Intention requires confirmation in the GUI".into());
                }
            }
            return to_value(commands::update_intention(app.clone(), db, runtime, params).await?);
        }
        ControlRequest::Start { id } => {
            return to_value(commands::start_intention(app.clone(), runtime, id).await?);
        }
        ControlRequest::Stop { id } => {
            require_no_balanced_confirmation(app, id).await?;
            return to_value(commands::stop_intention(app.clone(), db, runtime, id).await?);
        }
        ControlRequest::Delete { id } => {
            require_no_balanced_confirmation(app, id).await?;
            commands::delete_intention(app.clone(), db, runtime, id).await?;
            return Ok(json!({ "deleted": id }));
        }
    }
}

async fn require_no_balanced_confirmation(app: &AppHandle, id: i64) -> Result<(), String> {
    let db = app.state::<DatabaseState>();
    let active = commands::get_active_intention_session(db.clone(), id).await?;
    if active.is_none() {
        return Ok(());
    }
    if let Some(intention) = commands::get_intention(db, id).await? {
        if let IntentionBehavior::Block(block) = intention.behavior {
            if block.enforcement_mode == IntentionEnforcementMode::Balanced {
                return Err("Ending or deleting an active Balanced Intention requires confirmation in the GUI".into());
            }
        }
    }
    return Ok(());
}

fn to_value(value: impl Serialize) -> Result<Value, String> {
    return serde_json::to_value(value).map_err(|e| e.to_string());
}

fn write_frame(writer: &mut impl Write, value: &impl Serialize) -> Result<(), String> {
    let mut frame = serde_json::to_vec(value).map_err(|e| e.to_string())?;
    frame.push(b'\n');
    return writer.write_all(&frame).map_err(|e| e.to_string());
}

fn read_frame(reader: &mut impl Read, limit: usize) -> Result<Vec<u8>, String> {
    let mut frame = Vec::new();
    BufReader::new(reader.take((limit + 1) as u64))
        .read_until(b'\n', &mut frame)
        .map_err(|e| e.to_string())?;
    if frame.len() > limit {
        return Err("CLI message exceeds size limit".into());
    }
    if frame.last() != Some(&b'\n') {
        return Err("Incomplete CLI message".into());
    }
    return Ok(frame);
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "command", rename_all = "camelCase", deny_unknown_fields)]
pub enum ControlRequest {
    List,
    Status,
    Show { id: i64 },
    Create { params: Value },
    Update { params: Value },
    Start { id: i64 },
    Stop { id: i64 },
    Delete { id: i64 },
}

#[derive(Serialize, Deserialize)]
#[serde(tag = "status", rename_all = "camelCase")]
enum ControlResponse {
    Ok { result: Value },
    Error { message: String },
}

const MAX_REQUEST_BYTES: usize = 1024 * 1024;
const MAX_RESPONSE_BYTES: usize = 16 * 1024 * 1024;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn protocol_rejects_truncated_and_oversized_requests() {
        assert!(read_frame(&mut &b"{}"[..], 10).is_err());
        assert!(read_frame(&mut &b"123456\n"[..], 5).is_err());
        assert_eq!(read_frame(&mut &b"{}\n"[..], 3).unwrap(), b"{}\n");
    }

    #[test]
    fn protocol_rejects_unknown_commands_and_fields() {
        assert!(
            serde_json::from_str::<ControlRequest>(r#"{"command":"sql","query":"DELETE"}"#)
                .is_err()
        );
        assert!(serde_json::from_str::<ControlRequest>(
            r#"{"command":"stop","id":1,"force":true}"#
        )
        .is_err());
    }

    #[test]
    fn socket_round_trip_preserves_errors_and_unicode() {
        let (mut client, mut server) = UnixStream::pair().unwrap();
        let worker = std::thread::spawn(move || {
            let frame = read_frame(&mut server, MAX_REQUEST_BYTES).unwrap();
            let request: ControlRequest = serde_json::from_slice(&frame).unwrap();
            assert!(matches!(request, ControlRequest::Stop { id: 42 }));
            write_frame(
                &mut server,
                &ControlResponse::Error {
                    message: "Błąd sesji".into(),
                },
            )
            .unwrap();
        });
        write_frame(&mut client, &ControlRequest::Stop { id: 42 }).unwrap();
        let frame = read_frame(&mut client, MAX_RESPONSE_BYTES).unwrap();
        let response: ControlResponse = serde_json::from_slice(&frame).unwrap();
        assert!(matches!(response, ControlResponse::Error { message } if message == "Błąd sesji"));
        worker.join().unwrap();
    }
}
