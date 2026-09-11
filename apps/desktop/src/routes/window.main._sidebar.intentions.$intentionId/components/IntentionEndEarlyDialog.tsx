import React from 'react';
import {
	Alert,
	AlertDescription,
	Button,
	Dialog,
	DialogBody,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	ShieldIcon,
	TimedButton,
	useToastsCx
} from '@/components';
import { type specta } from '@/environment';
import { useCountdown } from '@/hooks';
import {
	useIntentionsCx,
	type EditBlockIntentionCx,
	type TEditBlockIntentionActionPolicy
} from '@/modules/intentions';

const IntentionEndEarlyDialog: React.FC<TIntentionEndEarlyDialogProps> = (props) => {
	const { intention, open, policy, isPending, onOpenChange, onEndEarly } = props;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>End early</DialogTitle>
					<DialogDescription>{intention.name}</DialogDescription>
				</DialogHeader>
				<DialogBody className="space-y-2">
					<p>End this running Intention early?</p>
					{policy.type === 'delayed' && (
						<p className="text-base-500 text-sm">
							Balanced Enforcement requires a pause before ending early.
						</p>
					)}
					{policy.type === 'blocked' && (
						<Alert role="note" variant="warning">
							<ShieldIcon />
							<AlertDescription>
								Strict Enforcement blocks ending early while this Intention is running.
							</AlertDescription>
						</Alert>
					)}
				</DialogBody>
				<DialogFooter>
					<DialogClose render={<Button type="button" disabled={isPending} />}>
						{policy.type === 'blocked' ? 'Close' : 'Cancel'}
					</DialogClose>
					{policy.type === 'delayed' && (
						<DelayedEndEarlyButton
							durationMs={policy.durationMs}
							isPending={isPending}
							isRunning={open}
							onEndEarly={onEndEarly}
						/>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

interface TIntentionEndEarlyDialogProps {
	intention: specta.Intention;
	open: boolean;
	policy: TEditBlockIntentionActionPolicy;
	isPending: boolean;
	onOpenChange: (open: boolean) => void;
	onEndEarly: () => void;
}

const DelayedEndEarlyButton: React.FC<TDelayedEndEarlyButtonProps> = (props) => {
	const { durationMs, isPending, isRunning, onEndEarly } = props;
	const remainingEndEarlyDelayMs = useCountdown({
		durationMs,
		isRunning
	});

	return (
		<TimedButton
			key={isRunning ? 'running' : 'idle'}
			type="button"
			variant="destructive"
			duration={isRunning ? durationMs : undefined}
			disabled={isPending}
			onClick={onEndEarly}
		>
			{getDelayedEndEarlyActionLabel(remainingEndEarlyDelayMs)}
		</TimedButton>
	);
};

interface TDelayedEndEarlyButtonProps {
	durationMs: number;
	isPending: boolean;
	isRunning: boolean;
	onEndEarly: () => void;
}

function getDelayedEndEarlyActionLabel(remainingMs: number): string {
	if (remainingMs <= 0) {
		return 'End early';
	}

	const remainingSeconds = Math.ceil(remainingMs / 1_000);
	return `End in ${remainingSeconds}s`;
}

export function useIntentionEndEarlyDialog(
	options: TUseIntentionEndEarlyDialogOptions
): TIntentionEndEarlyDialogHandle {
	const { cx, isActive } = options;
	const intentionsCx = useIntentionsCx();
	const toastsCx = useToastsCx();
	const [isOpen, setIsOpen] = React.useState(false);
	const [isPending, setIsPending] = React.useState(false);
	const endEarlyPolicy = cx.getEndEarlyPolicy({ isActive });

	const stopIntentionEarly = React.useCallback(async (): Promise<boolean> => {
		setIsPending(true);
		try {
			const [isSessionOk, sessionErr] = await intentionsCx.stop(cx.intention.id);
			if (!isSessionOk) {
				toastsCx.add({
					type: 'error',
					title: 'Could not end Intention early',
					description: sessionErr
				});
				return false;
			}

			return true;
		} finally {
			setIsPending(false);
		}
	}, [cx.intention.id, intentionsCx, toastsCx]);

	const endEarly = React.useCallback(() => {
		if (endEarlyPolicy.type === 'available') {
			void stopIntentionEarly();
			return;
		}

		setIsOpen(true);
	}, [endEarlyPolicy.type, stopIntentionEarly]);

	const handleEndEarly = React.useCallback(async () => {
		const didEndEarly = await stopIntentionEarly();
		if (didEndEarly) {
			setIsOpen(false);
		}
	}, [stopIntentionEarly]);

	return {
		endEarly,
		isPending,
		dialog: (
			<IntentionEndEarlyDialog
				intention={cx.intention}
				open={isOpen}
				policy={endEarlyPolicy}
				isPending={isPending}
				onOpenChange={setIsOpen}
				onEndEarly={handleEndEarly}
			/>
		)
	};
}

interface TUseIntentionEndEarlyDialogOptions {
	cx: EditBlockIntentionCx;
	isActive: boolean;
}

interface TIntentionEndEarlyDialogHandle {
	endEarly: () => void;
	isPending: boolean;
	dialog: React.ReactElement;
}
