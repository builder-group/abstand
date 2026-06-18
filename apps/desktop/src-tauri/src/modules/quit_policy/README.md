# Quit Policy

The quit policy controls whether the normal Tauri app process may exit while protected Abstands are active.

It handles graceful quit paths only. It can prevent quits from the app menu, tray, process signals, and Tauri `ExitRequested` events. It cannot recover the app after the process exits or is killed. The recovery agent covers that out-of-process case.

## Enforcement

Strict Enforcement blocks quitting immediately.

Balanced Enforcement delays quitting. The backend emits a `QuitPreventedEvent::ActiveBalancedBlock` event with the largest active Balanced pause as `durationMs`, and the frontend owns the countdown UI. After the frontend delay, it calls `confirmBalancedQuit`.

## Design Decisions

### Why does the frontend own the Balanced delay?

Balanced delay is UI friction, not backend enforcement. The backend owns the delay duration so the policy stays centralized, but the frontend owns the countdown and confirmation UI. This matches the intention edit policy.

Strict remains backend-enforced. `confirmBalancedQuit` still rejects when Strict Enforcement is active.

### Why does app-initiated exit use a one-shot approval?

Tauri emits `ExitRequested` after `app.exit(0)`. Without a handoff, an exit that already passed quit policy would be assessed a second time by the native exit hook.

The approval is set before `app.exit(0)` and consumed by `handle_exit_requested`. It is single-use, so native exit events without approval still run the normal policy assessment.
