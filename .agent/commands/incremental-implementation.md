Implement the requested change in small, reviewable slices instead of one broad pass.

A slice is one coherent step that can be understood, reviewed, and validated on its own. Use this workflow when the user wants incremental implementation, sliced work, or step-by-step architecture.

1. Start by identifying the smallest useful first slice.
2. Before editing each slice, state the slice goal, why it is the next step, and the expected files or modules.
3. Keep each slice focused on one contract, state shape, behavior change, integration step, or validation boundary.
4. Prefer foundation slices before dependent wiring, such as data shape before APIs, APIs before UI, and behavior before polish.
5. Avoid bundling unrelated cleanup, generated artifacts, UI wiring, and backend architecture into the same slice unless the user explicitly asks for a full pass.
6. After each slice, summarize what changed, what validation ran, and what the next slice should be.
7. Stop for review after a slice that changes public APIs, event payloads, state architecture, generated artifacts, user-facing behavior, or cross-module contracts.
8. If a later slice reveals the current slice was the wrong shape, pause and explain the tradeoff before rewriting it.
9. Keep slices large enough to be meaningful, but small enough that a human can review the diff without getting buried.
