import React from 'react';
import { specta } from '@/environment';
import { useCountdown } from '@/hooks';
import { createMountLifecycle, toTuple } from '@/lib';
import { ToastsCx, useToastsCx } from '../display';
import { TimedButton } from '../input';

export const AppRuntimeBridge: React.FC = () => {
	const toastsCx = useToastsCx();

	React.useEffect(() => {
		const lifecycle = createMountLifecycle();

		void (async () => {
			lifecycle.addCleanup(
				await specta.events.quitPreventedEvent.listen(({ payload }) => {
					switch (payload.reason) {
						case 'activeStrictBlock':
							toastsCx.add({
								type: 'warning',
								title: 'Quit prevented',
								description: 'Strict Enforcement blocks quitting while it is running.'
							});
							break;
						case 'activeBalancedBlock':
							toastsCx.add({
								type: 'warning',
								title: 'Quit delayed',
								description: 'Balanced Enforcement requires a pause before quitting.',
								timeout: payload.durationMs + 5_000,
								data: {
									action: <DelayedQuitAction durationMs={payload.durationMs} toastsCx={toastsCx} />
								}
							});
							break;
					}
				})
			);

			if (lifecycle.isUnmounted()) return;

			await specta.commands.notifyFrontendReady();
		})();

		return lifecycle.unmount;
	}, [toastsCx]);

	return null;
};

const DelayedQuitAction: React.FC<TDelayedQuitActionProps> = (props) => {
	const { durationMs, toastsCx } = props;
	const remainingQuitDelayMs = useCountdown({
		durationMs,
		isRunning: true
	});
	const [isPending, setIsPending] = React.useState(false);

	const handleConfirm = React.useCallback(async () => {
		setIsPending(true);
		try {
			const [isQuitOk, quitErr] = toTuple(await specta.commands.confirmBalancedQuit());
			if (!isQuitOk) {
				toastsCx.add({
					type: 'error',
					title: 'Could not quit',
					description: quitErr
				});
			}
		} finally {
			setIsPending(false);
		}
	}, [toastsCx]);

	return (
		<TimedButton
			type="button"
			variant="soft"
			size="sm"
			duration={durationMs}
			disabled={isPending}
			onClick={() => void handleConfirm()}
		>
			{getDelayedQuitActionLabel(remainingQuitDelayMs)}
		</TimedButton>
	);
};

interface TDelayedQuitActionProps {
	durationMs: number;
	toastsCx: ToastsCx;
}

function getDelayedQuitActionLabel(remainingMs: number): string {
	if (remainingMs <= 0) {
		return 'Quit';
	}

	const remainingSeconds = Math.ceil(remainingMs / 1_000);
	return `Quit in ${remainingSeconds}s`;
}
