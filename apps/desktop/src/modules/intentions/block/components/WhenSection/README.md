# When Section

## Start Modes

- `Start now` persists a manual start condition and immediately starts the Intention after creation.
- `At time` creates a one-shot date-time start.
- `After delay` creates a one-shot date-time start relative to submit time, up to 5 years out.
- `Repeats` creates a schedule start with a time and optional weekday mask.
- `Manually` creates a manual start condition.

## End Modes

- `After duration` creates an after-start transition end, up to 5 years out.
- `At time` is contextual:
  - With a repeating start, it creates a schedule end using the start schedule's weekdays and the end time.
  - Otherwise, it creates a one-shot date-time end.
- `Manually` creates a manual end condition.
