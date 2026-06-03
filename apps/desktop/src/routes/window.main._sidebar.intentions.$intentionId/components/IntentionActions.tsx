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
import { useIntentionsCx, type EditBlockIntentionCx } from '@/modules/intentions';
import { useIntentionDeleteDialog } from './IntentionDeleteDialog';
import { useIntentionEndEarlyDialog } from './IntentionEndEarlyDialog';

export const IntentionActions: React.FC<TIntentionActionsProps> = (props) => {
	const { cx, isActive, isDisabled = false, isSessionPrimary = false, leading } = props;
	const intentionsCx = useIntentionsCx();
	const toastsCx = useToastsCx();
	const [pendingSessionAction, setPendingSessionAction] =
		React.useState<TPendingSessionAction | null>(null);
	const {
		dialog: deleteDialog,
		isPending: isDeletePending,
		open: openDeleteDialog
	} = useIntentionDeleteDialog({ cx, isActive });
	const {
		dialog: endEarlyDialog,
		endEarly,
		isPending: isEndEarlyPending
	} = useIntentionEndEarlyDialog({ cx, isActive });
	const hasManualStartCondition = cx.intention.conditions.some(
		(condition) => condition.transition === 'start' && condition.rule.type === 'manual'
	);
	const hasManualEndCondition = cx.intention.conditions.some(
		(condition) => condition.transition === 'end' && condition.rule.type === 'manual'
	);
	const shouldShowSessionAction = isActive || hasManualStartCondition;
	const isPending = pendingSessionAction != null || isDeletePending || isEndEarlyPending;

	// MARK: - Actions

	const handleSessionAction = React.useCallback(async () => {
		if (isActive) {
			if (!hasManualEndCondition) {
				endEarly();
				return;
			}

			setPendingSessionAction('stop');
			const [isSessionOk, sessionErr] = await intentionsCx.stop(cx.intention.id);
			setPendingSessionAction(null);

			if (!isSessionOk) {
				toastsCx.add({
					type: 'error',
					title: 'Could not end Intention',
					description: sessionErr
				});
			}
			return;
		}

		if (!hasManualStartCondition) {
			return;
		}

		setPendingSessionAction('start');
		const [isSessionOk, sessionErr] = await intentionsCx.start(cx.intention.id);
		setPendingSessionAction(null);

		if (!isSessionOk) {
			toastsCx.add({
				type: 'error',
				title: 'Could not begin Intention',
				description: sessionErr
			});
		}
	}, [
		cx.intention.id,
		endEarly,
		hasManualEndCondition,
		hasManualStartCondition,
		intentionsCx,
		isActive,
		toastsCx
	]);

	// MARK: - UI

	return (
		<>
			{leading}
			{shouldShowSessionAction && (
				<Button
					type="button"
					variant={isSessionPrimary ? 'primary' : 'default'}
					disabled={isDisabled || isPending}
					onClick={handleSessionAction}
				>
					{isActive ? (hasManualEndCondition ? 'End' : 'End Early') : 'Begin'}
				</Button>
			)}
			<DropMenu>
				<DropMenuTrigger
					render={
						<Button
							type="button"
							aria-label="More Intention actions"
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
	cx: EditBlockIntentionCx;
	isActive: boolean;
	isDisabled?: boolean;
	isSessionPrimary?: boolean;
	leading?: React.ReactNode;
}

type TPendingSessionAction = 'start' | 'stop';
