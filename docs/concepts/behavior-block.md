# Block

> Status: Implemented

Block is a behavior that builds hard banks around attention for the full duration of an Intention. Configured apps and websites are inaccessible until the end condition is met.

The goal is to remove access to known distractions before the moment of temptation. The user decides once, then Abstand holds the boundary.

## How Block works

1. **Choose scope:** the user decides how broadly the Intention blocks.
2. **Choose targets:** the user selects the apps and websites involved in that scope.
3. **Start the Intention:** when the Intention runs, Abstand applies the block.
4. **Hold until end:** the block stays active until an end condition is met or the enforcement mode allows an early exit.

## Scope

**Block targets:** selected apps and websites are blocked. The rest of the computer is unaffected.

**Allow targets:** selected apps and websites remain available while everything else is blocked.

**Whole device:** the entire computer is locked behind a full-screen immersive overlay. This suits Intentions like overnight screen limits or deep focus windows where no access at all is the goal.

## Enforcement

Enforcement controls whether the Abstand can be ended early.

- `casual`: exit anytime
- `balanced`: exit after a deliberate pause
- `strict`: no exit until the end condition is met

The right level depends on the Intention. Overnight blocks usually fit `strict`. Morning focus windows usually fit `balanced`.

## Design intent

Block should feel firm and predictable. The user chose the boundary in advance, then Abstand holds it without asking for another decision when attention is most likely to branch.
