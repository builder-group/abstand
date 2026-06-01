import { useEventCallback } from 'feature-react/state';
import React from 'react';
import {
	Button,
	Dialog,
	DialogBody,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	TimedButton
} from '@/components';
import { type specta } from '@/environment';
import { useCountdown } from '@/hooks';
import { type TIntentionActionPolicy } from '@/modules/intentions';

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
						<p className="text-base-500">
							Strict Enforcement prevents saving changes while this Intention is active.
						</p>
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

	return <p className="text-base-500">{getDelayedSaveLabel(remainingSaveDelayMs)}</p>;
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
	const { intention, policy, isPending, onSave } = options;
	const [isOpen, setIsOpen] = React.useState(false);

	const open = React.useCallback(() => {
		setIsOpen(true);
	}, []);

	const handleSave = useEventCallback(async () => {
		const didSave = await onSave();
		if (didSave) {
			setIsOpen(false);
		}
	});

	return {
		open,
		dialog: (
			<IntentionSaveDialog
				intention={intention}
				open={isOpen}
				policy={policy}
				isPending={isPending}
				onOpenChange={setIsOpen}
				onSave={handleSave}
			/>
		)
	};
}

interface TUseIntentionSaveDialogOptions {
	intention: specta.Intention;
	policy: TIntentionActionPolicy;
	isPending: boolean;
	onSave: () => Promise<boolean>;
}

interface TIntentionSaveDialogHandle {
	open: () => void;
	dialog: React.ReactElement;
}
