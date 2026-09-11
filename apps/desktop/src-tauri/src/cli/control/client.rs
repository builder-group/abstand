use super::{
    protocol::{
        read_frame, write_frame, ControlRequest, ControlResponse, ControlResult, MAX_RESPONSE_BYTES,
    },
    socket_path,
};
use std::{os::unix::net::UnixStream, time::Duration};

pub fn send(request: &ControlRequest) -> Result<ControlResult, String> {
    let path = socket_path()?;
    let mut stream = UnixStream::connect(&path).map_err(|error| {
        format!(
            "Cannot connect to Abstand: {}. Run `abs app start`, then retry. Socket: {}",
            error,
            path.display()
        )
    })?;
    stream
        .set_read_timeout(Some(Duration::from_secs(30)))
        .map_err(|error| error.to_string())?;
    stream
        .set_write_timeout(Some(Duration::from_secs(5)))
        .map_err(|error| error.to_string())?;

    write_frame(&mut stream, request)?;
    let response: ControlResponse =
        read_frame(&mut stream, MAX_RESPONSE_BYTES)
            .and_then(|frame| serde_json::from_slice(&frame).map_err(|error| error.to_string()))
            .map_err(|error| {
                format!(
                    "CLI response unavailable: {}. The operation may have completed; check status before retrying.",
                    error
                )
            })?;

    return match response {
        ControlResponse::Ok { result } => Ok(result),
        ControlResponse::Error { message } => Err(message),
    };
}
