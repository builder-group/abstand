import AppKit

enum WindowPointer {
    /// Resolves a raw integer window pointer to an NSWindow.
    static func resolve(_ windowPtr: Int) -> NSWindow? {
        guard let rawPointer = UnsafeRawPointer(bitPattern: windowPtr) else {
            return nil
        }

        return Unmanaged<NSWindow>.fromOpaque(rawPointer).takeUnretainedValue()
    }

    /// Resolves the window pointer and runs the action on the main thread.
    /// Returns `false` for a null pointer. Non-null pointers must reference a live NSWindow.
    static func withWindow(
        _ windowPtr: Int,
        perform action: @MainActor @escaping (NSWindow) -> Void
    )
        -> Bool
    {
        return FfiMainActorBridge.run {
            guard let window = resolve(windowPtr) else {
                return false
            }

            action(window)
            return true
        }
    }
}
