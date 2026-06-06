# Intention

An Intention is a configured commitment. It defines when it starts, when it ends, and which behavior enforces the Abstand. The app holds it and runs it automatically.

## Why Intention

The Intention is what separates Abstand from willpower. The user decides once, in advance, while clear-headed. When the moment comes, when temptation is highest, the Intention carries that decision.

Intentions are not Abstands. They are the plans that make Abstands happen.

## When it fires

Each Intention has start and end conditions. Conditions can be time-based (fires at a local wall-clock time like 09:00) or manual (fires when the user presses Begin).

Multiple conditions in the same phase are evaluated with OR logic: any start condition can begin the Abstand, and any end condition can end it.

## What it does

The behavior on an Intention determines what kind of Abstand is enforced when it fires. Each behavior has its own configuration and creates a different kind of distance.

Current and explored behaviors:

| Behavior | Status      | Purpose                                                     |
| -------- | ----------- | ----------------------------------------------------------- |
| Block    | Implemented | Keeps selected apps and websites out of reach               |
| Break    | Planned     | Schedules screen breaks during longer sessions              |
| Flow     | Concept     | Builds momentum with progressive, adaptive focus blocks     |
| Focus    | Concept     | Keeps one chosen app clear while other apps visually recede |

## Overlapping Intentions

When two Intentions are active simultaneously, both run independently unless a specific behavior defines a different interaction. A Block and a Break active at the same time both enforce: the block stays in effect, and the break appears on top.

## Profiles

Profiles group Intentions in the sidebar for organizational clarity. They carry no logic. All behavior lives in the Intention itself.
