# Project Spec

Abstand is a macOS app for creating intentional distance from digital distractions. The user defines boundaries in advance, and the app holds them when it matters.

## The problem

The problem is not a lack of discipline. Most people know what they want to work on. The problem is that digital environments pull at attention constantly. Every notification, every tab, and every quick check is a small branch from the intended work. By the end of the day, those branches add up and the work that mattered did not happen.

## The solution

Abstand is built around one idea: attention flows better when it has boundaries, the way a river moves with more power when it has banks. Without them, it spreads thin. The app builds those boundaries. The user decides what they are.

The difference from a timer is that Abstand does not measure discipline after the fact. It sets a structure in advance that holds without requiring a decision at the moment of temptation.

## Core concepts

The concepts are the foundation of every decision in this project. When something is unclear, go back to the concepts.

- **The River:** attention is a river. Fixed energy. Concentrated it travels far. Branched it spreads thin. Abstand builds the banks. See `docs/concepts/river.md`.
- **Abstand:** the active experience of intentional distance. What the user lives through when an Intention fires. See `docs/concepts/abstand.md`.
- **Intention:** the configured commitment. When it starts, when it ends, which behavior enforces it. The planning layer that makes Abstands happen automatically. See `docs/concepts/intention.md`.
- **Block:** implemented behavior that builds a hard wall for the full duration. Apps and websites stay inaccessible until the end condition is met. See `docs/concepts/behavior-block.md`.
- **Break:** planned behavior that schedules screen breaks during longer sessions. See `docs/concepts/behavior-break.md`.
- **Flow:** concept behavior for progressive, adaptive focus blocks that build momentum. See `docs/concepts/behavior-flow.md`.
- **Focus:** concept behavior for keeping one chosen app visually clear while other apps recede. See `docs/concepts/behavior-focus.md`.

## Interface

The app is centered on a sidebar for navigation, a detail panel for configuration, and a menu bar icon for tracking live session state.

Intentions are grouped by profile. Selecting one opens the detail panel, which shows configuration when idle and live state when an Abstand is active. The menu bar shows the current Abstand state and elapsed time.

## Product language

### Core terms

| Term      | Meaning                                                          |
| --------- | ---------------------------------------------------------------- |
| Intention | A configured commitment that triggers an Abstand                 |
| Abstand   | The active experience of intentional distance                    |
| Block     | A behavior that builds a hard wall for the duration              |
| Break     | A behavior that schedules screen breaks at regular intervals     |
| Flow      | A concept behavior that builds focus with adaptive work blocks   |
| Focus     | A concept behavior that narrows attention to one chosen app      |
| Portage   | Ending an Abstand early, treated as a valid decision not failure |
| Profile   | An organizational grouping of Intentions in the sidebar          |

### Future-facing language

- Flow Map: a visual record of an Abstand session, built from activity data
- Artifact: a reward object earned at session end
- Branching: when attention tries to escape to a blocked app or website

## What is in scope now

- Block Intention: app and website blocking with time-based and manual start and end conditions
- Profiles: organizational grouping of Intentions in the sidebar
- Menu bar icon with live Abstand state

## What comes later

- Break Intention: rhythm of screen breaks over a longer window, with enforcement levels
- Flow Intention: immersive progressive focus timer with adaptive work blocks
- Focus Intention: one selected app stays clear while other apps visually recede
- Session recording: activity data collected during an Abstand to support the Flow Map
- Flow Map: a visual record generated after a session, built from activity events
- Artifact rewards: earned at session end
- Live river visualization: a line that flows during an Abstand and branches when a blocked app or website is attempted

## Pricing direction

One-time purchase. The buyer owns that version forever and gets one year of updates.
