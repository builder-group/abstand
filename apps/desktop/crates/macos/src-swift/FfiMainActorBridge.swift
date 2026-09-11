import Foundation

enum FfiMainActorBridge {
    /// Runs main-actor AppKit work synchronously for Rust FFI callers.
    ///
    /// Rust calls this bridge through synchronous C symbols, so callers need the
    /// return value before control goes back to Rust.
    static func run(_ work: @MainActor @escaping () -> Bool) -> Bool {
        if Thread.isMainThread {
            return runOnMainQueue(work)
        }

        let run = { runOnMainQueue(work) }
        return DispatchQueue.main.sync(execute: run)
    }

    private static func runOnMainQueue(_ work: @MainActor @escaping () -> Bool) -> Bool {
        dispatchPrecondition(condition: .onQueue(.main))
        // Note: This synchronous FFI bridge avoids a Swift concurrency runtime dependency
        return unsafeBitCast(work, to: (() -> Bool).self)()
    }
}
