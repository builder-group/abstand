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
	getIntentionActionPolicy,
	type EditBlockIntentionCx,
	type TIntentionActionPolicy
} from '@/modules/intentions';

const IntentionSaveDialog: React.FC<TIntentionSaveDialogProps> = (props) => {
	const { intention, open, policy, isPending, onOpenChange, onSave } = props;
	const timedSaveDurationMs = open && policy.type === 'delayed' ? policy.durationMs : undefined;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Save Changes</DialogTitle>
					<DialogDescription>{intention.name}</DialogDescription>
				</DialogHeader>
				<DialogBody className="space-y-2">
					<p>Save changes to this active Intention?</p>
					{policy.type === 'delayed' && (
						<DelayedSaveMessage durationMs={timedSaveDurationMs} isRunning={open} />
					)}
					{policy.type === 'blocked' && (
						<Alert role="note" variant="warning">
							<ShieldIcon />
							<AlertDescription>
								Strict Enforcement prevents saving changes while this Intention is active.
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
							variant="primary"
							duration={timedSaveDurationMs}
							disabled={isPending}
							onClick={onSave}
						>
							Save Changes
						</TimedButton>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

interface TIntentionSaveDialogProps {
	intention: specta.Intention;
	open: boolean;
	policy: TIntentionActionPolicy;
	isPending: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: () => void;
}

const DelayedSaveMessage: React.FC<TDelayedSaveMessageProps> = (props) => {
	const { durationMs, isRunning } = props;
	const remainingSaveDelayMs = useCountdown({
		durationMs,
		isRunning
	});

	if (remainingSaveDelayMs <= 0) {
		return null;
	}

	return (
		<Alert role="note" variant="info">
			<TimerIcon />
			<AlertDescription>{getDelayedSaveLabel(remainingSaveDelayMs)}</AlertDescription>
		</Alert>
	);
};

interface TDelayedSaveMessageProps {
	durationMs?: number;
	isRunning: boolean;
}

function getDelayedSaveLabel(remainingMs: number): string {
	const remainingSeconds = Math.ceil(remainingMs / 1_000);
	const unit = remainingSeconds === 1 ? 'second' : 'seconds';
	return `Save unlocks in ${remainingSeconds} ${unit}.`;
}

export function useIntentionSaveDialog(
	options: TUseIntentionSaveDialogOptions
): TIntentionSaveDialogHandle {
	const { cx, intention, isActive } = options;
	const toastsCx = useToastsCx();
	const [isOpen, setIsOpen] = React.useState(false);
	const [isPending, setIsPending] = React.useState(false);
	const savePolicy = getIntentionActionPolicy(intention, { isActive });

	const saveIntention = React.useCallback(async (): Promise<boolean> => {
		setIsPending(true);
		try {
			const [isIntentionOk, intentionErr] = await cx.save();
			if (!isIntentionOk) {
				if (intentionErr.code === 'updateFailed') {
					toastsCx.add({
						type: 'error',
						title: 'Could not save intention',
						description: intentionErr.message
					});
				}
				return false;
			}

			toastsCx.add({
				type: 'success',
				title: 'Saved intention'
			});
			return true;
		} finally {
			setIsPending(false);
		}
	}, [cx, toastsCx]);

	const save = React.useCallback(() => {
		if (savePolicy.type === 'available') {
			void saveIntention();
			return;
		}

		setIsOpen(true);
	}, [saveIntention, savePolicy.type]);

	const handleSave = React.useCallback(async () => {
		const didSave = await saveIntention();
		if (didSave) {
			setIsOpen(false);
		}
	}, [saveIntention]);

	return {
		save,
		isPending,
		dialog: (
			<IntentionSaveDialog
				intention={intention}
				open={isOpen}
				policy={savePolicy}
				isPending={isPending}
				onOpenChange={setIsOpen}
				onSave={handleSave}
			/>
		)
	};
}

interface TUseIntentionSaveDialogOptions {
	cx: EditBlockIntentionCx;
	intention: specta.Intention;
	isActive: boolean;
}

interface TIntentionSaveDialogHandle {
	save: () => void;
	isPending: boolean;
	dialog: React.ReactElement;
}
