import { createComputed, createState } from 'feature-state';
import React from 'react';
import { type ToastsCx } from '@/components';
import { specta } from '@/environment';
import { createMountLifecycle, toTuple } from '@/lib';

export class BlockingOverlayCx {
	private readonly toastsCx: ToastsCx;

	public readonly $violation = createState<specta.BlockingViolation | null>(null);
	public readonly $isOpeningIntention = createState(false);
	public readonly $isPausingOverlay = createState(false);

	private readonly $blockedAppCloseState = createState<TBlockedAppCloseState | null>(null);
	public readonly $blockedAppCloseStatus = createComputed(
		[this.$violation, this.$blockedAppCloseState] as const,
		([violation, closeState]): TBlockedAppCloseStatus => {
			if (violation == null || closeState == null) {
				return 'idle';
			}

			const targetKey = getBlockedTargetKey(violation.blockedTarget);
			return closeState.targetKey === targetKey ? closeState.status : 'idle';
		}
	);

	constructor(initialViolation: specta.BlockingViolation | null, toastsCx: ToastsCx) {
		this.$violation.set(initialViolation);
		this.toastsCx = toastsCx;
	}

	public mount(): () => void {
		const lifecycle = createMountLifecycle();

		void (async () => {
			lifecycle.addCleanup(
				await specta.events.blockingViolationChangedEvent.listen(({ payload }) => {
					this.setViolation(payload);
				})
			);

			if (lifecycle.isUnmounted()) return;

			lifecycle.addCleanup(
				await specta.events.blockedAppQuitTimedOutEvent.listen(({ payload }) => {
					this.handleAppQuitTimedOut(payload);
				})
			);
		})();

		return lifecycle.unmount;
	}

	public async quitBlockedApp(): Promise<void> {
		const target = this.getCurrentBlockedAppTarget();
		if (target == null) {
			return;
		}

		const targetKey = getBlockedTargetKey(target);
		this.$blockedAppCloseState.set({ status: 'quitting', targetKey });

		const [isQuitOk, , quitResult] = toTuple(
			await specta.commands.quitBlockedAppByBundleId(target.bundleId)
		);
		if (!this.isQuittingBlockedApp(targetKey)) {
			return;
		}
		if (!isQuitOk) {
			this.requestManualAppClose(target);
			return;
		}

		if (quitResult.status === 'failed' || quitResult.status === 'unsupported') {
			this.requestManualAppClose(target);
		}
	}

	public async pauseOverlayTemporarily(): Promise<void> {
		this.$isPausingOverlay.set(true);
		try {
			await specta.commands.pauseBlockingOverlay(PAUSE_BLOCKING_OVERLAY_DURATION_MS);
		} finally {
			this.$isPausingOverlay.set(false);
		}
	}

	public async openIntention(): Promise<void> {
		const violation = this.$violation.get();
		if (violation == null) {
			return;
		}

		this.$isOpeningIntention.set(true);
		try {
			await specta.commands.showIntentionInMainWindow(violation.intentionId);
		} finally {
			this.$isOpeningIntention.set(false);
		}
	}

	private setViolation(violation: specta.BlockingViolation | null): void {
		this.$violation.set(violation);

		const closeState = this.$blockedAppCloseState.get();
		if (closeState == null) {
			return;
		}

		const targetKey = violation != null ? getBlockedTargetKey(violation.blockedTarget) : null;
		if (targetKey !== closeState.targetKey) {
			this.$blockedAppCloseState.set(null);
		}
	}

	private handleAppQuitTimedOut(event: specta.BlockedAppQuitTimedOutEvent): void {
		const target = this.getCurrentBlockedAppTarget();
		if (target == null || target.bundleId !== event.bundleId) {
			return;
		}

		const targetKey = getBlockedTargetKey(target);
		if (!this.isQuittingBlockedApp(targetKey)) {
			return;
		}

		this.requestManualAppClose(target);
	}

	private requestManualAppClose(target: TBlockedAppTarget): void {
		this.$blockedAppCloseState.set({
			status: 'needsManualClose',
			targetKey: getBlockedTargetKey(target)
		});
		this.toastsCx.add({
			type: 'warning',
			title: `Could not quit ${target.displayName}`,
			description: 'Use Pause 5s to quit it manually.'
		});
	}

	private getCurrentBlockedAppTarget(): TBlockedAppTarget | null {
		const target = this.$violation.get()?.blockedTarget;
		return target?.type === 'app' ? target : null;
	}

	private isQuittingBlockedApp(targetKey: string): boolean {
		const closeState = this.$blockedAppCloseState.get();
		return closeState?.status === 'quitting' && closeState.targetKey === targetKey;
	}
}

const PAUSE_BLOCKING_OVERLAY_DURATION_MS = 5_000;

type TBlockedAppTarget = Extract<specta.BlockedTarget, { type: 'app' }>;

type TBlockedAppCloseState =
	| { status: 'quitting'; targetKey: string }
	| { status: 'needsManualClose'; targetKey: string };

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
	initialViolation: specta.BlockingViolation | null,
	toastsCx: ToastsCx
): BlockingOverlayCx {
	const cx = React.useMemo(
		() => new BlockingOverlayCx(initialViolation, toastsCx),
		[initialViolation, toastsCx]
	);

	React.useEffect(() => {
		return cx.mount();
	}, [cx]);

	return cx;
}
