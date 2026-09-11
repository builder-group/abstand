use super::recorder::ForegroundActivityRecorderError;
use mado::WindowEvent;
use tokio::sync::{mpsc, oneshot};

// MARK: - State

pub struct ForegroundActivityRecorderState {
    sender: mpsc::UnboundedSender<ForegroundActivityRecorderMessage>,
}

impl ForegroundActivityRecorderState {
    pub fn new(sender: mpsc::UnboundedSender<ForegroundActivityRecorderMessage>) -> Self {
        return Self { sender };
    }

    pub fn enqueue(
        &self,
        event: ForegroundActivityRecorderMessage,
    ) -> Result<(), mpsc::error::SendError<ForegroundActivityRecorderMessage>> {
        return self.sender.send(event);
    }
}

pub enum ForegroundActivityRecorderMessage {
    Window {
        event: WindowEvent,
        occurred_at: i64,
    },
    Close {
        ended_at: i64,
        reply: oneshot::Sender<Result<(), ForegroundActivityRecorderError>>,
    },
}
