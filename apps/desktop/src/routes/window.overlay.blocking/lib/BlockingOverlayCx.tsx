import { createComputed, createState } from 'feature-state';
import React from 'react';
import { type ToastsCx } from '@/components';
import { specta } from '@/environment';
import { createMountLifecycle, toTuple } from '@/lib';

export class BlockingOverlayCx {
	private readonly _toastsCx: ToastsCx;

	private readonly _key: string;
	public readonly $violation = createState<specta.BlockingViolation | null>(null);
	public readonly $isOpeningIntention = createState(false);
	public readonly $isPausingOverlay = createState(false);

	private readonly _blockedAppCloseState = createState<TBlockedAppCloseState | null>(null);
	public readonly $blockedAppCloseStatus = createComputed(
		[this.$violation, this._blockedAppCloseState] as const,
		([violation, closeState]): TBlockedAppCloseStatus => {
			if (violation == null || closeState == null) {
				return 'idle';
			}

			const targetKey = getBlockedTargetKey(violation.blockedTarget);
			return closeState.targetKey === targetKey ? closeState.status : 'idle';
		}
	);

	constructor(key: string, initialViolation: specta.BlockingViolation | null, toastsCx: ToastsCx) {
		this._key = key;
		this.$violation.set(initialViolation);
		this._toastsCx = toastsCx;
	}

	public mount(): () => void {
		const lifecycle = createMountLifecycle();
		let latestRequestId = 0;
		const refreshViolation = async () => {
			const requestId = ++latestRequestId;
			const violation = await specta.commands.getBlockingViolation(this._key);
			// Note: Overlapping refreshes can finish out of order
			if (lifecycle.isUnmounted() || requestId !== latestRequestId) return;
			this._applyViolation(violation);
		};

		void (async () => {
			lifecycle.addCleanup(
				await specta.events.activeBlockingViolationChangedEvent.listen(async ({ payload }) => {
					if (payload.key !== this._key) {
						return;
					}
					await refreshViolation();
				})
			);

			if (lifecycle.isUnmounted()) return;

			lifecycle.addCleanup(
				await specta.events.blockedAppQuitTimedOutEvent.listen(({ payload }) => {
					this._handleAppQuitTimedOut(payload);
				})
			);

			if (lifecycle.isUnmounted()) return;

			// Fetch once after listeners are registered so changes between the route loader and subscription are not missed
			if (this._key.length > 0) {
				await refreshViolation();
			}
		})();

		return lifecycle.unmount;
	}

	public async quitBlockedApp(): Promise<void> {
		const target = this._getCurrentBlockedAppTarget();
		if (target == null) {
			return;
		}

		const targetKey = getBlockedTargetKey(target);
		this._blockedAppCloseState.set({ status: 'quitting', targetKey });

		const [isQuitOk, , quitResult] = toTuple(
			await specta.commands.quitBlockedAppByBundleId(target.bundleId)
		);
		if (!this._isQuittingBlockedApp(targetKey)) {
			return;
		}
		if (!isQuitOk) {
			this._requestManualAppClose(target);
			return;
		}

		if (quitResult.status === 'failed' || quitResult.status === 'unsupported') {
			this._requestManualAppClose(target);
		}
	}

	public async pauseOverlayTemporarily(): Promise<void> {
		this.$isPausingOverlay.set(true);
		try {
			const [isPauseOk, pauseErr] = toTuple(
				await specta.commands.pauseBlockingOverlay(this._key, PAUSE_BLOCKING_OVERLAY_DURATION_MS)
			);
			if (!isPauseOk) {
				this._toastsCx.add({
					type: 'error',
					title: 'Could not pause overlay',
					description: pauseErr
				});
			}
		} finally {
			this.$isPausingOverlay.set(false);
		}
	}

	public async openIntention(): Promise<void> {
		this.$isOpeningIntention.set(true);
		try {
			const [isOpenOk, error] = toTuple(await specta.commands.showBlockingIntention(this._key));
			if (!isOpenOk) {
				this._toastsCx.add({
					type: 'error',
					title: 'Could not open intention',
					description: error
				});
			}
		} finally {
			this.$isOpeningIntention.set(false);
		}
	}

	private _applyViolation(violation: specta.BlockingViolation | null): void {
		this.$violation.set(violation);

		const closeState = this._blockedAppCloseState.get();
		if (closeState == null) {
			return;
		}

		const targetKey = violation != null ? getBlockedTargetKey(violation.blockedTarget) : null;
		if (targetKey !== closeState.targetKey) {
			this._blockedAppCloseState.set(null);
		}
	}

	private _handleAppQuitTimedOut(event: specta.BlockedAppQuitTimedOutEvent): void {
		const target = this._getCurrentBlockedAppTarget();
		if (target == null || target.bundleId !== event.bundleId) {
			return;
		}

		const targetKey = getBlockedTargetKey(target);
		if (!this._isQuittingBlockedApp(targetKey)) {
			return;
		}

		this._requestManualAppClose(target);
	}

	private _requestManualAppClose(target: TBlockedAppTarget): void {
		this._blockedAppCloseState.set({
			status: 'needsManualClose',
			targetKey: getBlockedTargetKey(target)
		});
		this._toastsCx.add({
			type: 'warning',
			title: `Could not quit ${target.displayName}`,
			description: 'Use Pause 5s to quit it manually.'
		});
	}

	private _getCurrentBlockedAppTarget(): TBlockedAppTarget | null {
		const target = this.$violation.get()?.blockedTarget;
		return target?.type === 'app' ? target : null;
	}

	private _isQuittingBlockedApp(targetKey: string): boolean {
		const closeState = this._blockedAppCloseState.get();
		return closeState?.status === 'quitting' && closeState.targetKey === targetKey;
	}
}

const PAUSE_BLOCKING_OVERLAY_DURATION_MS = 5_000;

type TBlockedAppTarget = Extract<specta.BlockedTarget, { type: 'app' }>;

type TBlockedAppCloseState =
	{ status: 'quitting'; targetKey: string } | { status: 'needsManualClose'; targetKey: string };

type TBlockedAppCloseStatus = 'idle' | 'quitting' | 'needsManualClose';

function getBlockedTargetKey(target: specta.BlockedTarget): string {
	switch (target.type) {
		case 'app':
			return `app:${target.bundleId}`;
		case 'website':
			return `website:${target.hostname}`;
		case 'device':
			return 'device';
	}
}

export function useCreateBlockingOverlayCx(
	key: string,
	initialViolation: specta.BlockingViolation | null,
	toastsCx: ToastsCx
): BlockingOverlayCx {
	const cx = React.useMemo(
		() => new BlockingOverlayCx(key, initialViolation, toastsCx),
		[key, initialViolation, toastsCx]
	);

	React.useEffect(() => {
		return cx.mount();
	}, [cx]);

	return cx;
}
