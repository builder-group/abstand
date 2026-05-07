# Break

Break is a behavior that creates a rhythm of forced breaks over a longer window. The computer is interrupted at regular intervals and a full-screen overlay appears, pulling attention away from the screen for a short duration before resuming.

## How a break works

1. **Warning:** one minute before the break, a reminder appears. The user can skip from here depending on enforcement.
2. **Break:** a full-screen overlay holds for the configured duration.
3. **Resume:** the overlay clears and the interval resets.

## Enforcement

- `casual`: breaks can be skipped from the warning
- `balanced`: breaks can be skipped from the warning, but not once the overlay appears
- `strict`: no skipping, the break runs its full duration

## With Block

If a Break Intention and a Block Intention are active at the same time both run independently. The block stays in effect during breaks. The Break overlay appears on top.
