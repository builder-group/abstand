import Foundation

enum FfiMainActorBridge {
    /// Runs main-actor AppKit work synchronously for Rust FFI callers.
    ///
    /// Rust calls this bridge through synchronous C symbols, so callers need the
    /// return value before control goes back to Rust.
    static func run(_ work: @MainActor @escaping () -> Bool) -> Bool {
        if Thread.isMainThread {
            return MainActor.assumeIsolated { work() }
        }

        return DispatchQueue.main.sync {
            MainActor.assumeIsolated { work() }
        }
    }
}
