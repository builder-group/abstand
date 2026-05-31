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
	useToastsCx
} from '@/components';
import { type specta } from '@/environment';
import { useIntentionsCx } from '@/modules/intentions';

const IntentionDeleteDialog: React.FC<TIntentionDeleteDialogProps> = (props) => {
	const { intention, open, isActive, isPending, onOpenChange, onDelete } = props;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete Intention</DialogTitle>
					<DialogDescription>{intention.name}</DialogDescription>
				</DialogHeader>
				<DialogBody>
					{isActive
						? 'This removes the Intention and cancels its active Abstand.'
						: 'This removes the Intention.'}
				</DialogBody>
				<DialogFooter>
					<DialogClose render={<Button type="button" disabled={isPending} />}>Cancel</DialogClose>
					<Button type="button" variant="destructive" disabled={isPending} onClick={onDelete}>
						Delete
					</Button>
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
