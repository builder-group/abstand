import React from 'react';
import {
	Button,
	DropMenu,
	DropMenuContent,
	DropMenuItem,
	DropMenuTrigger,
	MoreVerticalIcon,
	Trash2Icon,
	useToastsCx
} from '@/components';
import { type specta } from '@/environment';
import { useIntentionsCx } from '@/modules/intentions';
import { useIntentionDeleteDialog } from './IntentionDeleteDialog';
import { useIntentionEndEarlyDialog } from './IntentionEndEarlyDialog';

export const IntentionActions: React.FC<TIntentionActionsProps> = (props) => {
	const { intention, isActive, isDisabled = false, isSessionPrimary = false } = props;
	const intentionsCx = useIntentionsCx();
	const toastsCx = useToastsCx();
	const [pendingSessionAction, setPendingSessionAction] =
		React.useState<TPendingSessionAction | null>(null);
	const {
		dialog: deleteDialog,
		isPending: isDeletePending,
		open: openDeleteDialog
	} = useIntentionDeleteDialog({ intention, isActive });
	const {
		dialog: endEarlyDialog,
		endEarly,
		isPending: isEndEarlyPending
	} = useIntentionEndEarlyDialog({ intention, isActive });
	const hasManualEndCondition = intention.conditions.some(
		(condition) => condition.transition === 'end' && condition.rule.type === 'manual'
	);
	const isPending = pendingSessionAction != null || isDeletePending || isEndEarlyPending;

	// MARK: - Actions

	const handleSessionAction = React.useCallback(async () => {
		if (isActive) {
			if (!hasManualEndCondition) {
				endEarly();
				return;
			}

			setPendingSessionAction('stop');
			const [isSessionOk, sessionErr] = await intentionsCx.stop(intention.id);
			setPendingSessionAction(null);

			if (!isSessionOk) {
				toastsCx.add({
					type: 'error',
					title: 'Could not end intention',
					description: sessionErr
				});
			}
			return;
		}

		setPendingSessionAction('start');
		const [isSessionOk, sessionErr] = await intentionsCx.start(intention.id);
		setPendingSessionAction(null);

		if (!isSessionOk) {
			toastsCx.add({
				type: 'error',
				title: 'Could not begin intention',
				description: sessionErr
			});
		}
	}, [endEarly, hasManualEndCondition, intention.id, intentionsCx, isActive, toastsCx]);

	// MARK: - UI

	return (
		<>
			<Button
				type="button"
				variant={isSessionPrimary ? 'primary' : 'default'}
				disabled={isDisabled || isPending}
				onClick={handleSessionAction}
			>
				{isActive ? (hasManualEndCondition ? 'End' : 'End Early') : 'Begin'}
			</Button>
			<DropMenu>
				<DropMenuTrigger
					render={
						<Button
							type="button"
							aria-label="More intention actions"
							variant="ghost"
							size="icon-sm"
							disabled={isDisabled || isPending}
						>
							<MoreVerticalIcon />
						</Button>
					}
				/>
				<DropMenuContent side="bottom" align="end" className="w-48">
					<DropMenuItem
						variant="destructive"
						disabled={isDisabled || isPending}
						onClick={openDeleteDialog}
					>
						<Trash2Icon />
						<span>Delete Intention</span>
					</DropMenuItem>
				</DropMenuContent>
			</DropMenu>
			{endEarlyDialog}
			{deleteDialog}
		</>
	);
};

interface TIntentionActionsProps {
	intention: specta.Intention;
	isActive: boolean;
	isDisabled?: boolean;
	isSessionPrimary?: boolean;
}

type TPendingSessionAction = 'start' | 'stop';
