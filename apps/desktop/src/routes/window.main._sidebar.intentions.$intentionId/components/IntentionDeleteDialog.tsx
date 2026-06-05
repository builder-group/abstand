import { useNavigate } from '@tanstack/react-router';
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

const IntentionDeleteDialog: React.FC<TIntentionDeleteDialogProps> = (props) => {
	const { intention, open, isActive, policy, isPending, onOpenChange, onDelete } = props;

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
						{isActive && ' Its running session will end.'}
					</p>
					{policy.type === 'delayed' && (
						<p className="text-base-500 text-sm">
							Balanced Enforcement delays this action briefly so it stays intentional.
						</p>
					)}
					{policy.type === 'blocked' && (
						<Alert role="note" variant="warning">
							<ShieldIcon />
							<AlertDescription>
								Strict Enforcement blocks deleting this Intention while it is running.
							</AlertDescription>
						</Alert>
					)}
				</DialogBody>
				<DialogFooter>
					<DialogClose render={<Button type="button" disabled={isPending} />}>
						{policy.type === 'blocked' ? 'Close' : 'Cancel'}
					</DialogClose>
					{policy.type === 'delayed' && (
						<DelayedDeleteButton
							durationMs={policy.durationMs}
							isPending={isPending}
							isRunning={open}
							onDelete={onDelete}
						/>
					)}
					{policy.type === 'available' && (
						<Button type="button" variant="destructive" disabled={isPending} onClick={onDelete}>
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
	policy: TEditBlockIntentionActionPolicy;
	isPending: boolean;
	onOpenChange: (open: boolean) => void;
	onDelete: () => void;
}

const DelayedDeleteButton: React.FC<TDelayedDeleteButtonProps> = (props) => {
	const { durationMs, isPending, isRunning, onDelete } = props;
	const remainingDeleteDelayMs = useCountdown({
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
			onClick={onDelete}
		>
			{getDelayedDeleteActionLabel(remainingDeleteDelayMs)}
		</TimedButton>
	);
};

interface TDelayedDeleteButtonProps {
	durationMs: number;
	isPending: boolean;
	isRunning: boolean;
	onDelete: () => void;
}

function getDelayedDeleteActionLabel(remainingMs: number): string {
	if (remainingMs <= 0) {
		return 'Delete';
	}

	const remainingSeconds = Math.ceil(remainingMs / 1_000);
	return `Delete in ${remainingSeconds}s`;
}

export function useIntentionDeleteDialog(
	options: TUseIntentionDeleteDialogOptions
): TIntentionDeleteDialogHandle {
	const { cx, isActive } = options;
	const navigate = useNavigate();
	const intentionsCx = useIntentionsCx();
	const toastsCx = useToastsCx();
	const [isOpen, setIsOpen] = React.useState(false);
	const [isPending, setIsPending] = React.useState(false);
	const deletePolicy = cx.getDeletePolicy({ isActive });

	const deleteIntention = React.useCallback(async (): Promise<boolean> => {
		setIsPending(true);
		try {
			const [isDeleteOk, deleteErr] = await intentionsCx.deleteIntention(cx.intention.id);
			if (!isDeleteOk) {
				toastsCx.add({
					type: 'error',
					title: 'Could not delete Intention',
					description: deleteErr
				});
				return false;
			}

			toastsCx.add({
				type: 'success',
				title: 'Deleted Intention'
			});
			void navigate({ to: '/window/main/today' });
			return true;
		} finally {
			setIsPending(false);
		}
	}, [cx.intention.id, intentionsCx, navigate, toastsCx]);

	const open = React.useCallback(() => {
		setIsOpen(true);
	}, []);

	const handleDelete = React.useCallback(async () => {
		const didDelete = await deleteIntention();
		if (didDelete) {
			setIsOpen(false);
		}
	}, [deleteIntention]);

	return {
		open,
		isPending,
		dialog: (
			<IntentionDeleteDialog
				intention={cx.intention}
				open={isOpen}
				isActive={isActive}
				policy={deletePolicy}
				isPending={isPending}
				onOpenChange={setIsOpen}
				onDelete={handleDelete}
			/>
		)
	};
}

interface TUseIntentionDeleteDialogOptions {
	cx: EditBlockIntentionCx;
	isActive: boolean;
}

interface TIntentionDeleteDialogHandle {
	open: () => void;
	isPending: boolean;
	dialog: React.ReactElement;
}
