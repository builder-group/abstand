import React from 'react';

/** Returns remaining milliseconds rounded up to a step, or the full duration while stopped. */
export function useCountdown(options: TUseCountdownOptions): number {
	const { durationMs, isRunning, stepMs = 1_000 } = options;
	const resolvedDurationMs =
		durationMs == null || !Number.isFinite(durationMs) || durationMs <= 0 ? 0 : durationMs;
	const resolvedStepMs = !Number.isFinite(stepMs) || stepMs <= 0 ? 1_000 : stepMs;
	const countdownStore = React.useMemo(
		() =>
			createCountdownStore({
				durationMs: resolvedDurationMs,
				isRunning,
				stepMs: resolvedStepMs
			}),
		[resolvedDurationMs, isRunning, resolvedStepMs]
	);

	return React.useSyncExternalStore(
		countdownStore.subscribe,
		countdownStore.getSnapshot,
		countdownStore.getSnapshot
	);
}

interface TUseCountdownOptions {
	durationMs?: number;
	isRunning: boolean;
	stepMs?: number;
}

function createCountdownStore(options: TCreateCountdownStoreOptions): TCountdownStore {
	const { durationMs, isRunning, stepMs } = options;
	let roundedRemainingMs = getRoundedRemainingMs(durationMs, stepMs);

	return {
		getSnapshot: () => roundedRemainingMs,
		subscribe: (onStoreChange) => {
			if (durationMs === 0 || !isRunning) {
				return () => undefined;
			}

			const endsAtMs = Date.now() + durationMs;
			let timeoutId: number | null = null;

			const scheduleUpdate = (remainingMs: number, nextRoundedRemainingMs: number): void => {
				if (nextRoundedRemainingMs === 0) {
					return;
				}

				const delayMs = Math.max(0, remainingMs - Math.max(0, nextRoundedRemainingMs - stepMs));
				timeoutId = window.setTimeout(updateRemainingMs, delayMs);
			};

			const updateRemainingMs = (): void => {
				timeoutId = null;
				const remainingMs = endsAtMs - Date.now();
				const nextRoundedRemainingMs = getRoundedRemainingMs(remainingMs, stepMs);
				const didRoundedRemainingMsChange = roundedRemainingMs !== nextRoundedRemainingMs;
				roundedRemainingMs = nextRoundedRemainingMs;

				scheduleUpdate(remainingMs, nextRoundedRemainingMs);

				if (didRoundedRemainingMsChange) {
					onStoreChange();
				}
			};

			scheduleUpdate(durationMs, roundedRemainingMs);

			return () => {
				if (timeoutId != null) {
					window.clearTimeout(timeoutId);
				}
			};
		}
	};
}

interface TCreateCountdownStoreOptions {
	durationMs: number;
	isRunning: boolean;
	stepMs: number;
}

interface TCountdownStore {
	getSnapshot: () => number;
	subscribe: (onStoreChange: () => void) => () => void;
}

function getRoundedRemainingMs(remainingMs: number, stepMs: number): number {
	if (remainingMs <= 0) {
		return 0;
	}

	return Math.ceil(remainingMs / stepMs) * stepMs;
}
