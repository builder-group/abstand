# Project Spec

Abstand is a macOS app for creating intentional distance from digital distractions. You configure Intentions, the rules for when to block apps and when to lock your computer, and the app runs them automatically. When an Intention fires, you take an Abstand: the active moment of stepping back.

## The problem

The problem is not a lack of discipline. Most people know what they want to work on. The problem is that digital environments pull at attention constantly. Every notification, every tab, every quick check is a small branch from what you actually intended to do. By the end of the day those branches add up and the work that mattered did not happen.

## The solution

Abstand is built around one idea: attention flows better when it has boundaries, the way a river moves with more power when it has banks. Without them it spreads thin. The app builds those boundaries. You decide what they are.

The difference from a timer is that you are not measuring discipline after the fact. You are setting a structure in advance that holds without requiring a decision at the moment of temptation.

## Interface

The app has two panels: a sidebar for navigation and a detail panel for configuration and visualization. There is also a menu bar icon for tracking live session state.

The sidebar lists Intentions grouped by profile. Selecting one opens the detail panel, which shows configuration when idle and the live river visualization when an Abstand is active. The menu bar shows the current Abstand state and elapsed time.

## The session experience

When an Intention fires and an Abstand begins, the detail panel shows a live river visualization. The line flows as time passes. If a blocked app or URL is attempted, the line branches, marking the moment attention tried to escape.

Block Intentions show a full-screen immersive overlay when the entire computer is locked. When specific apps or URLs are blocked rather than everything, the block is applied at the app level without a full-screen takeover.

Pulse Intentions fire an immersive full-screen overlay at each interval. The overlay holds for the configured duration and can be skipped or snoozed depending on the enforcement level.

Ending an Abstand early is called Portage. It stops the session without framing it as a failure.

Post-session Flow Map generation and artifact rewards are planned for a future release.

## Brand language

| Term              | Meaning                                           |
| ----------------- | ------------------------------------------------- |
| Intention         | A configured commitment that triggers an Abstand  |
| Taking an Abstand | The active moment of intentional distance         |
| The Flow          | The active Abstand ("Current Flow: 42m")          |
| The Banks         | The blocked apps and URLs                         |
| Branching         | A blocked app or URL being attempted              |
| The Sea           | Successful completion of an Abstand               |
| Portage           | Ending an Abstand early                           |
| Flow Map          | The generated river visualization after a session |
| Artifact          | The reward object earned at session end           |

## Pricing

One-time purchase. No subscription. The buyer owns that version forever and gets one year of updates.

## What is in MVP

- Block Intention: app and URL blocking with TIME and MANUAL start and end conditions
- Profiles: organizational grouping of Intentions in the sidebar
- Live river visualization: a line that flows during an Abstand and branches when a blocked app or URL is attempted
- Session logging: activity data collected from day one to support the future Flow Map
- Menu bar icon with live Abstand state

## What is not in MVP

- Pulse Intention ships after MVP. The core mechanic needs to be right before adding interval-based breaks.
- Flow Map and artifact rewards come after the core is validated. The live river in MVP is direct feedback only.
- Flow, a progressive Pomodoro timer, requires a different execution model. It is scoped to a future release.
