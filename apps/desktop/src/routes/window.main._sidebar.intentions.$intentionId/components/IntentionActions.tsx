import React from 'react';
import {
	Button,
	DropMenu,
	DropMenuContent,
	DropMenuItem,
	DropMenuTrigger,
	MoreVerticalIcon,
	PauseIcon,
	PlayIcon,
	Trash2Icon,
	useToastsCx
} from '@/components';
import { useIntentionsCx, type EditBlockIntentionCx } from '@/modules/intentions';
import { useIntentionDeleteDialog } from './IntentionDeleteDialog';
import { useIntentionEndEarlyDialog } from './IntentionEndEarlyDialog';

export const IntentionActions: React.FC<TIntentionActionsProps> = (props) => {
	const { cx, isActive, hasUnsavedChanges = false, isDisabled = false, editActions } = props;
	const intentionsCx = useIntentionsCx();
	const toastsCx = useToastsCx();

	const manualStartCondition = cx.intention.conditions.find(
		(condition) => condition.transition === 'start' && condition.rule.type === 'manual'
	);
	const manualEndCondition = cx.intention.conditions.find(
		(condition) => condition.transition === 'end' && condition.rule.type === 'manual'
	);

	const isPaused = cx.intention.pausedAt != null;

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

	const [pendingSessionAction, setPendingSessionAction] =
		React.useState<TPendingSessionAction | null>(null);
	const [pendingPauseAction, setPendingPauseAction] = React.useState<TPendingPauseAction | null>(
		null
	);
	const isPending =
		pendingSessionAction != null ||
		pendingPauseAction != null ||
		isDeletePending ||
		isEndEarlyPending;
	const shouldShowSessionAction =
		isActive || (!isPaused && manualStartCondition != null && !hasUnsavedChanges);

	// MARK: - Actions

	const handleSessionAction = React.useCallback(async () => {
		if (isActive) {
			if (manualEndCondition == null) {
				endEarly();
				return;
			}

			setPendingSessionAction('end');
			const [isSessionOk, sessionErr] = await intentionsCx.complete(
				cx.intention.id,
				manualEndCondition.id
			);
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

		if (manualStartCondition == null) {
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
		intentionsCx,
		isActive,
		manualStartCondition,
		manualEndCondition,
		toastsCx
	]);

	const handlePauseAction = React.useCallback(async () => {
		const nextAction = isPaused ? 'resume' : 'pause';
		setPendingPauseAction(nextAction);
		const [isIntentionOk, intentionErr] =
			nextAction === 'pause'
				? await intentionsCx.pause(cx.intention.id)
				: await intentionsCx.resume(cx.intention.id);
		setPendingPauseAction(null);

		if (!isIntentionOk) {
			toastsCx.add({
				type: 'error',
				title: nextAction === 'pause' ? 'Could not pause Intention' : 'Could not resume Intention',
				description: intentionErr
			});
			return;
		}

		toastsCx.add({
			type: 'success',
			title: getPauseSuccessTitle(nextAction, isActive)
		});
	}, [cx.intention.id, intentionsCx, isActive, isPaused, toastsCx]);

	// MARK: - UI

	return (
		<>
			{editActions}
			{shouldShowSessionAction && (
				<Button
					type="button"
					variant={isActive ? 'default' : 'primary'}
					disabled={isDisabled || isPending}
					onClick={handleSessionAction}
				>
					{isActive ? (manualEndCondition != null ? 'End' : 'End early') : 'Begin'}
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
						disabled={isDisabled || isPending || hasUnsavedChanges}
						onClick={handlePauseAction}
					>
						{isPaused ? <PlayIcon /> : <PauseIcon />}
						<span>{getPauseActionLabel({ isActive, isPaused })}</span>
					</DropMenuItem>
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
	hasUnsavedChanges?: boolean;
	isDisabled?: boolean;
	editActions?: React.ReactNode;
}

type TPendingSessionAction = 'start' | 'end';
type TPendingPauseAction = 'pause' | 'resume';

function getPauseActionLabel(options: { isActive: boolean; isPaused: boolean }): string {
	const { isActive, isPaused } = options;
	if (isPaused) {
		return 'Resume Intention';
	}
	if (isActive) {
		return 'Pause After This Run';
	}
	return 'Pause Intention';
}

function getPauseSuccessTitle(action: TPendingPauseAction, isActive: boolean): string {
	if (action === 'resume') {
		return 'Resumed Intention';
	}
	if (isActive) {
		return 'Will pause after this run';
	}
	return 'Paused Intention';
}
