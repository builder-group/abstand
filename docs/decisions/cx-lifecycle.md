# Cx Lifecycle for Tauri Bindings

Date: 2026-04-22
Status: provisional

## Context

In the desktop app, a `Cx` often binds frontend state to Rust-backed Tauri commands and events.

Typical examples:

- fetch initial data from Rust
- listen for backend-driven updates
- expose frontend methods that invoke Rust commands

We want one durable pattern for these bindings that is easy to understand, easy to repeat, and correct under React lifecycle rules.

The key design question is where lifecycle-sensitive backend work should start and stop.

For this app, the default Rust/frontend split is:

- frontend calls Rust with Tauri commands for request/response work
- Rust pushes updates to the frontend with Tauri events when backend state changes

## Options Considered

### Effect-backed mount lifecycle

Pros:

- keeps render-phase logic pure
- aligns with React's model for synchronizing with external systems
- cleanup is explicit and deterministic

Cons:

- requires lifecycle boilerplate in each provider
- async startup logic is split between constructor-time object creation and mount-time activation

### Render-phase initialization and memo-managed cleanup

Pros:

- compact provider code
- setup and teardown can appear colocated in one factory

Cons:

- starts backend side effects during render
- relies on render-time memo behavior for lifecycle-sensitive work
- cleanup timing is less explicit
- `FinalizationRegistry` is not a good foundation for essential cleanup
- easier to introduce races where async setup completes after the instance should already be gone

## Decision

Use an Effect-backed mount lifecycle for `Cx` instances that bind to Rust or other external systems:

- create `Cx` instances in `React.useMemo`
- keep constructors pure
- start Tauri listeners, async initialization, and other backend binding in `mount()`
- call `mount()` from `React.useEffect`
- return explicit cleanup from `mount()`
- use Tauri commands for request/response calls
- use Tauri events for backend-driven updates by default

Do not start backend side effects in a `Cx` constructor.

Do not use `useMemoCleanup` or `FinalizationRegistry` as the primary lifecycle mechanism for Rust/frontend bindings.

## Why This Is The Current Call

This decision is mostly about lifecycle correctness.

React expects render to stay pure. Tauri listeners, async startup, timers, and backend synchronization are lifecycle work, so they belong in an Effect-backed mount phase, not in render-time construction.

This pattern also keeps ownership clear:

- React owns when a `Cx` becomes active or inactive
- the `Cx` owns backend wiring and local state
- Rust owns persisted state and emits changes

That separation is easier to reason about and safer under React Strict Mode.

## Reference Shape

```tsx
const cx = React.useMemo(() => new SettingsCx(), []);

React.useEffect(() => {
  return cx.mount();
}, [cx]);
```

```ts
export class SettingsCx {
  public mount(): () => void {
    const lifecycle = createMountLifecycle();

    void (async () => {
      const settings = await specta.commands.getSettings();
      if (lifecycle.isUnmounted()) return;

      // apply initial state
      this.$appSettings.set(settings);

      lifecycle.addCleanup(
        await specta.events.appSettingsChangedEvent.listen((event) => {
          // update local state
        })
      );
    })();

    return lifecycle.unmount;
  }
}
```

## Resources & References

- React: [Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects)
- React: [Components and Hooks must be pure](https://react.dev/reference/rules/components-and-hooks-must-be-pure)
- React: [StrictMode](https://react.dev/reference/react/StrictMode)
- React: [useMemoCleanup](https://stackoverflow.com/questions/66446642/react-usememo-memory-clean)
- Tauri: [Calling Rust from the Frontend](https://v2.tauri.app/develop/calling-rust/)
- Tauri: [Calling the Frontend from Rust](https://v2.tauri.app/develop/calling-frontend/)
- MDN: [FinalizationRegistry](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry)
