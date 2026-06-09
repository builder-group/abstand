# Break

> Status: Planned

Break is an Intention type that schedules screen breaks during a longer Intention. It supports eye rest, posture resets, and recovery during extended computer use.

The goal is to make screen breaks part of the plan. The user decides the rhythm in advance, then Abstand holds that rhythm when work gets absorbing.

## How Break works

1. **Heads-up:** before the break, a reminder appears. The user can skip or defer from here depending on enforcement.
2. **Break:** an overlay asks the user to step away from the screen for the configured duration.
3. **Resume:** the overlay clears and the interval resets.

## Enforcement

- `casual`: breaks can be skipped from the heads-up
- `balanced`: breaks can be skipped from the heads-up, but not once the overlay appears
- `strict`: no skipping, the break runs its full duration

## Design intent

Break should feel clear and health-oriented. It protects rest, posture, and recovery during long computer sessions. It should not pretend the break is focused work.
