import Foundation

enum FfiMainActorBridge {
    /// Runs main-actor AppKit work synchronously for Rust FFI callers.
    ///
    /// Rust calls this bridge through synchronous C symbols, so callers need the
    /// return value before control goes back to Rust.
    static func run(_ work: @MainActor @escaping () -> Bool) -> Bool {
        if Thread.isMainThread {
            return runUnchecked(work)
        }

        return DispatchQueue.main.sync {
            runUnchecked(work)
        }
    }

    private static func runUnchecked(_ work: @MainActor @escaping () -> Bool)
        -> Bool
    {
        // Note: Swift has no synchronous MainActor.run for this FFI boundary.
        // DispatchQueue.main.sync gets execution onto the main thread; this
        // bridge then erases the closure's @MainActor qualifier before calling it.
        let uncheckedWork = unsafeBitCast(work, to: (() -> Bool).self)
        return uncheckedWork()
    }
}
