use mado::WindowEvent;
use tokio::sync::mpsc;

// MARK: - State

pub struct ForegroundActivityRecorderState {
    sender: mpsc::UnboundedSender<ForegroundActivityRecordEvent>,
}

impl ForegroundActivityRecorderState {
    pub fn new(sender: mpsc::UnboundedSender<ForegroundActivityRecordEvent>) -> Self {
        return Self { sender };
    }

    pub fn enqueue(
        &self,
        event: ForegroundActivityRecordEvent,
    ) -> Result<(), mpsc::error::SendError<ForegroundActivityRecordEvent>> {
        return self.sender.send(event);
    }
}

pub struct ForegroundActivityRecordEvent {
    pub event: WindowEvent,
    pub occurred_at: i64,
}
