export function createMountLifecycle(): TMountLifecycle {
	let isUnmounted = false;
	const cleanups: Array<() => void> = [];

	return {
		addCleanup(cleanup) {
			if (isUnmounted) {
				cleanup();
				return;
			}

			cleanups.push(cleanup);
		},
		isUnmounted() {
			return isUnmounted;
		},
		unmount() {
			if (isUnmounted) {
				return;
			}

			isUnmounted = true;
			while (cleanups.length > 0) {
				cleanups.pop()?.();
			}
		}
	};
}

export interface TMountLifecycle {
	addCleanup(cleanup: () => void): void;
	isUnmounted(): boolean;
	unmount: () => void;
}
