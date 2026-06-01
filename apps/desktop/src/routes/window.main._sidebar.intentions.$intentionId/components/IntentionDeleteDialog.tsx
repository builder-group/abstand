import { useNavigate } from '@tanstack/react-router';
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
	TimedButton,
	useToastsCx
} from '@/components';
import { type specta } from '@/environment';
import { useCountdown } from '@/hooks';
import { getIntentionActionPolicy, useIntentionsCx } from '@/modules/intentions';

const IntentionDeleteDialog: React.FC<TIntentionDeleteDialogProps> = (props) => {
	const { intention, open, isActive, isPending, onOpenChange, onDelete } = props;
	const deletePolicy = getIntentionActionPolicy(intention, { isActive });
	const timedDeleteDurationMs =
		open && deletePolicy.type === 'delayed' ? deletePolicy.durationMs : undefined;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete Intention</DialogTitle>
					<DialogDescription>{intention.name}</DialogDescription>
				</DialogHeader>
				<DialogBody className="space-y-2">
					<p>
						Delete this Intention? This cannot be undone.
						{isActive && ' The active Intention will be stopped.'}
					</p>
					{deletePolicy.type === 'delayed' && (
						<DelayedDeleteMessage durationMs={timedDeleteDurationMs} isRunning={open} />
					)}
					{deletePolicy.type === 'blocked' && (
						<p className="text-base-500">
							Strict Enforcement prevents deleting while this Intention is active.
						</p>
					)}
				</DialogBody>
				<DialogFooter>
					<DialogClose render={<Button type="button" disabled={isPending} />}>Cancel</DialogClose>
					{deletePolicy.type === 'delayed' ? (
						<TimedButton
							key={open ? 'open' : 'closed'}
							type="button"
							variant="destructive"
							duration={timedDeleteDurationMs}
							disabled={isPending}
							onClick={onDelete}
						>
							Delete
						</TimedButton>
					) : (
						<Button
							type="button"
							variant="destructive"
							disabled={isPending || deletePolicy.type === 'blocked'}
							onClick={onDelete}
						>
							Delete
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

interface TIntentionDeleteDialogProps {
	intention: specta.Intention;
	open: boolean;
	isActive: boolean;
	isPending: boolean;
	onOpenChange: (open: boolean) => void;
	onDelete: () => void;
}

const DelayedDeleteMessage: React.FC<TDelayedDeleteMessageProps> = (props) => {
	const { durationMs, isRunning } = props;
	const remainingDeleteDelayMs = useCountdown({
		durationMs,
		isRunning
	});

	if (remainingDeleteDelayMs <= 0) {
		return null;
	}

	return <p className="text-base-500">{getDelayedDeleteLabel(remainingDeleteDelayMs)}</p>;
};

interface TDelayedDeleteMessageProps {
	durationMs?: number;
	isRunning: boolean;
}

function getDelayedDeleteLabel(remainingMs: number): string {
	const remainingSeconds = Math.ceil(remainingMs / 1_000);
	const unit = remainingSeconds === 1 ? 'second' : 'seconds';
	return `Delete unlocks in ${remainingSeconds} ${unit}.`;
}

export function useIntentionDeleteDialog(
	options: TUseIntentionDeleteDialogOptions
): TIntentionDeleteDialogHandle {
	const { intention, isActive } = options;
	const navigate = useNavigate();
	const intentionsCx = useIntentionsCx();
	const toastsCx = useToastsCx();
	const [isOpen, setIsOpen] = React.useState(false);
	const [isPending, setIsPending] = React.useState(false);

	const open = React.useCallback(() => {
		setIsOpen(true);
	}, []);

	const handleDelete = React.useCallback(async () => {
		setIsPending(true);
		const [isDeleteOk, deleteErr] = await intentionsCx.deleteIntention(intention.id);
		setIsPending(false);

		if (!isDeleteOk) {
			toastsCx.add({
				type: 'error',
				title: 'Could not delete intention',
				description: deleteErr
			});
			return;
		}

		setIsOpen(false);
		toastsCx.add({
			type: 'success',
			title: 'Deleted intention'
		});
		void navigate({ to: '/window/main/today' });
	}, [intention.id, intentionsCx, navigate, toastsCx]);

	return {
		open,
		isPending,
		dialog: (
			<IntentionDeleteDialog
				intention={intention}
				open={isOpen}
				isActive={isActive}
				isPending={isPending}
				onOpenChange={setIsOpen}
				onDelete={handleDelete}
			/>
		)
	};
}

interface TUseIntentionDeleteDialogOptions {
	intention: specta.Intention;
	isActive: boolean;
}

interface TIntentionDeleteDialogHandle {
	open: () => void;
	isPending: boolean;
	dialog: React.ReactElement;
}
