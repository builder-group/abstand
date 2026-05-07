# Block

Block is a behavior that builds hard banks around your attention for the full duration of an Intention. Configured apps and websites are inaccessible until the end condition is met.

## Scope

Block uses scope to decide how broadly an Intention blocks.

**Block targets:** selected apps and websites are blocked. The rest of the computer is unaffected.

**Allow targets:** selected apps and websites remain available while everything else is blocked.

**Whole device:** the entire computer is locked behind a full-screen immersive overlay. Suited to Intentions like overnight screen limits or deep focus windows where no access at all is the goal.

## Enforcement

Enforcement controls whether the Abstand can be ended early.

- `casual`: exit anytime
- `balanced`: exit after a deliberate pause
- `hardcore`: no exit until the end condition is met

The right level depends on the Intention. An overnight block probably wants `hardcore`. A morning focus window might want `balanced`.
