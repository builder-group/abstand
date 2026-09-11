use super::{
    protocol::{
        read_frame, write_frame, ControlRequest, ControlResponse, ControlResult, ControlStatus,
        MAX_REQUEST_BYTES,
    },
    socket_path,
};
use crate::{
    environment::configs::app::AppConfig,
    modules::{
        db::types::DatabaseState,
        intentions::{
            commands,
            intention::{IntentionBehavior, IntentionEnforcementMode},
            types::IntentionRuntimeState,
        },
    },
};
use std::{
    fs, io,
    os::unix::{
        fs::{DirBuilderExt, FileTypeExt, PermissionsExt},
        net::{UnixListener, UnixStream},
    },
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
                .mode(CONTROL_DIRECTORY_MODE)
                .create(directory)
                .map_err(|error| error.to_string())?;
        }
        Err(error) => return Err(error.to_string()),
    }
    fs::set_permissions(
        directory,
        fs::Permissions::from_mode(CONTROL_DIRECTORY_MODE),
    )
    .map_err(|error| error.to_string())?;

    match fs::symlink_metadata(&path) {
        Ok(metadata) => {
            if !metadata.file_type().is_socket() {
                return Err("Refusing to replace a non-socket CLI path".into());
            }
            match UnixStream::connect(&path) {
                Ok(_) => return Err("Another Abstand CLI server is already running".into()),
                Err(error) if error.kind() == io::ErrorKind::ConnectionRefused => {
                    fs::remove_file(&path).map_err(|error| error.to_string())?;
                }
                Err(error) => return Err(error.to_string()),
            }
        }
        Err(error) if error.kind() == io::ErrorKind::NotFound => {}
        Err(error) => return Err(error.to_string()),
    }

    let listener = UnixListener::bind(&path).map_err(|error| error.to_string())?;
    fs::set_permissions(&path, fs::Permissions::from_mode(CONTROL_SOCKET_MODE))
        .map_err(|error| error.to_string())?;

    let app = app.clone();
    std::thread::Builder::new()
        .name("cli-control".into())
        .spawn(move || serve(app, listener))
        .map_err(|error| error.to_string())?;

    return Ok(());
}

fn serve(app: AppHandle, listener: UnixListener) {
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
}

fn serve_connection(app: &AppHandle, mut stream: UnixStream) -> Result<(), String> {
    stream
        .set_read_timeout(Some(Duration::from_secs(5)))
        .map_err(|error| error.to_string())?;
    stream
        .set_write_timeout(Some(Duration::from_secs(5)))
        .map_err(|error| error.to_string())?;

    let result = read_frame(&mut stream, MAX_REQUEST_BYTES)
        .and_then(|frame| {
            serde_json::from_slice::<ControlRequest>(&frame).map_err(|error| error.to_string())
        })
        .and_then(|request| tauri::async_runtime::block_on(dispatch(app, request)));
    let response = match result {
        Ok(result) => ControlResponse::Ok { result },
        Err(message) => ControlResponse::Error { message },
    };

    return write_frame(&mut stream, &response);
}

async fn dispatch(app: &AppHandle, request: ControlRequest) -> Result<ControlResult, String> {
    // Keep CLI requests on the desktop command path so policy checks and side effects stay aligned
    let database_state = app.state::<DatabaseState>();
    let runtime_state = app.state::<IntentionRuntimeState>();
    return match request {
        ControlRequest::Status => Ok(ControlResult::Status(ControlStatus {
            version: AppConfig::display_version(),
            pid: std::process::id(),
            sessions: commands::get_active_intention_sessions(database_state).await?,
        })),
        ControlRequest::ListIntentions => Ok(ControlResult::Intentions(
            commands::get_intentions(database_state).await?,
        )),
        ControlRequest::GetIntention { intention_id } => {
            let intention = commands::get_intention(database_state, intention_id)
                .await?
                .ok_or_else(|| format!("Intention {} does not exist", intention_id))?;
            Ok(ControlResult::Intention(intention))
        }
        ControlRequest::CreateIntention { params } => Ok(ControlResult::Intention(
            commands::create_intention(app.clone(), database_state, runtime_state, params).await?,
        )),
        ControlRequest::StartIntention { intention_id } => Ok(ControlResult::Session(
            commands::start_intention(app.clone(), runtime_state, intention_id).await?,
        )),
        ControlRequest::StopIntention { intention_id } => {
            require_no_balanced_confirmation(app, intention_id).await?;
            Ok(ControlResult::Session(
                commands::stop_intention(app.clone(), database_state, runtime_state, intention_id)
                    .await?,
            ))
        }
        ControlRequest::DeleteIntention { intention_id } => {
            require_no_balanced_confirmation(app, intention_id).await?;
            commands::delete_intention(app.clone(), database_state, runtime_state, intention_id)
                .await?;
            Ok(ControlResult::Deleted {
                deleted: intention_id,
            })
        }
    };
}

async fn require_no_balanced_confirmation(
    app: &AppHandle,
    intention_id: i64,
) -> Result<(), String> {
    let database_state = app.state::<DatabaseState>();
    if commands::get_active_intention_session(database_state.clone(), intention_id)
        .await?
        .is_none()
    {
        return Ok(());
    }

    let Some(intention) = commands::get_intention(database_state, intention_id).await? else {
        return Ok(());
    };
    let IntentionBehavior::Block(block) = intention.behavior else {
        return Ok(());
    };
    if block.enforcement_mode == IntentionEnforcementMode::Balanced {
        return Err(
            "Ending or deleting an active Balanced Intention requires confirmation in the desktop app"
                .into(),
        );
    }

    return Ok(());
}

// Restrict access to the owner because CLI requests can change app state
const CONTROL_DIRECTORY_MODE: u32 = 0o700;
const CONTROL_SOCKET_MODE: u32 = 0o600;
