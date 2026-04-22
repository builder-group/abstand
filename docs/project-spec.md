# Project Spec

Abstand is a macOS app for creating intentional distance from digital distractions. You define the boundaries in advance, and the app holds them when it matters. Those boundaries are configured as Intentions: rules for when to block apps, URLs, or the entire computer. When an Intention fires, you take an Abstand: the active moment of stepping back.

## The problem

The problem is not a lack of discipline. Most people know what they want to work on. The problem is that digital environments pull at attention constantly. Every notification, every tab, every quick check is a small branch from what you actually intended to do. By the end of the day those branches add up and the work that mattered did not happen.

## The solution

Abstand is built around one idea: attention flows better when it has boundaries, the way a river moves with more power when it has banks. Without them it spreads thin. The app builds those boundaries. You decide what they are.

The difference from a timer is that you are not measuring discipline after the fact. You are setting a structure in advance that holds without requiring a decision at the moment of temptation.

## Interface

The app is currently centered on a sidebar for navigation, a detail panel for configuration and visualization, and a menu bar icon for tracking live session state.

Intentions are grouped by profile. Selecting one opens the detail panel, which shows configuration when idle and the live river visualization when an Abstand is active. The menu bar shows the current Abstand state and elapsed time.

The exact layout can evolve, but the core product shape is stable: configure boundaries, see live session state, and keep the active session close at hand.

## The session experience

When an Intention fires and an Abstand begins, the detail panel shows a live river visualization. The line flows as time passes. If a blocked app or URL is attempted, the line branches, marking the moment attention tried to escape.

Block Intentions show a full-screen immersive overlay when the entire computer is locked. When specific apps or URLs are blocked rather than everything, the block is applied at the app level without a full-screen takeover.

In a future release, Pulse Intentions can fire an immersive full-screen overlay at each interval. The overlay holds for the configured duration and can be skipped or snoozed depending on the enforcement level.

Ending an Abstand early is called Portage. It stops the session without framing it as a failure.

Post-session Flow Map generation and artifact rewards are planned for a future release.

## Product language

### Core terms

| Term              | Meaning                                           |
| ----------------- | ------------------------------------------------- |
| Intention         | A configured commitment that triggers an Abstand  |
| Taking an Abstand | The active moment of intentional distance         |
| Branching         | A blocked app or URL being attempted              |
| Portage           | Ending an Abstand early                           |
| Flow Map          | The generated river visualization after a session |

### Working or future-facing language

- The Flow: the active Abstand ("Current Flow: 42m")
- The Banks: the blocked apps and URLs
- The Sea: successful completion of an Abstand
- Artifact: the reward object earned at session end

## Pricing direction

The current direction is a one-time purchase rather than a subscription. The buyer would own that version forever and get one year of updates.

## What is in MVP

- Block Intention: app and URL blocking with time-based and manual start and end conditions
- Profiles: organizational grouping of Intentions in the sidebar
- Live river visualization: a line that flows during an Abstand and branches when a blocked app or URL is attempted
- Session logging: activity data collected from day one to support the future Flow Map
- Menu bar icon with live Abstand state

## What is not in MVP

- Pulse Intention ships after MVP. The core mechanic needs to be right before adding interval-based breaks.
- Flow Map and artifact rewards come after the core is validated. The live river in MVP is direct feedback only.
- Flow, a progressive Pomodoro timer, requires a different execution model. It is scoped to a future release.
