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
	TimerIcon,
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
	const timedEndEarlyDurationMs = open && policy.type === 'delayed' ? policy.durationMs : undefined;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>End Early</DialogTitle>
					<DialogDescription>{intention.name}</DialogDescription>
				</DialogHeader>
				<DialogBody className="space-y-2">
					<p>End this Intention early?</p>
					{policy.type === 'delayed' && (
						<DelayedEndEarlyMessage durationMs={timedEndEarlyDurationMs} isRunning={open} />
					)}
					{policy.type === 'blocked' && (
						<Alert role="note" variant="warning">
							<ShieldIcon />
							<AlertDescription>
								Strict Enforcement blocks ending this Intention early.
							</AlertDescription>
						</Alert>
					)}
				</DialogBody>
				<DialogFooter>
					<DialogClose render={<Button type="button" disabled={isPending} />}>
						{policy.type === 'blocked' ? 'Close' : 'Cancel'}
					</DialogClose>
					{policy.type === 'delayed' && (
						<TimedButton
							key={open ? 'open' : 'closed'}
							type="button"
							variant="destructive"
							duration={timedEndEarlyDurationMs}
							disabled={isPending}
							onClick={onEndEarly}
						>
							End Early
						</TimedButton>
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

const DelayedEndEarlyMessage: React.FC<TDelayedEndEarlyMessageProps> = (props) => {
	const { durationMs, isRunning } = props;
	const remainingEndEarlyDelayMs = useCountdown({
		durationMs,
		isRunning
	});

	if (remainingEndEarlyDelayMs <= 0) {
		return null;
	}

	return (
		<Alert role="note" variant="info">
			<TimerIcon />
			<AlertDescription>{getDelayedEndEarlyLabel(remainingEndEarlyDelayMs)}</AlertDescription>
		</Alert>
	);
};

interface TDelayedEndEarlyMessageProps {
	durationMs?: number;
	isRunning: boolean;
}

function getDelayedEndEarlyLabel(remainingMs: number): string {
	const remainingSeconds = Math.ceil(remainingMs / 1_000);
	const unit = remainingSeconds === 1 ? 'second' : 'seconds';
	return `End available in ${remainingSeconds} ${unit}.`;
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
					title: 'Could not end intention early',
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
