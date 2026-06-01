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

export const IntentionActions: React.FC<TIntentionActionsProps> = (props) => {
	const { intention, isActive, isDisabled = false, isSessionPrimary = false } = props;
	const intentionsCx = useIntentionsCx();
	const toastsCx = useToastsCx();
	const deleteDialog = useIntentionDeleteDialog({ intention, isActive });
	const [pendingSessionAction, setPendingSessionAction] =
		React.useState<TPendingSessionAction | null>(null);
	const hasManualEndCondition = intention.conditions.some(
		(condition) => condition.transition === 'end' && condition.rule.type === 'manual'
	);

	// MARK: - Actions

	const handleSessionAction = React.useCallback(async () => {
		if (isActive) {
			setPendingSessionAction('stop');
			const [isSessionOk, sessionErr] = await intentionsCx.stop(intention.id);
			setPendingSessionAction(null);

			if (!isSessionOk) {
				toastsCx.add({
					type: 'error',
					title: hasManualEndCondition
						? 'Could not end intention'
						: 'Could not end intention early',
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
	}, [hasManualEndCondition, intention.id, intentionsCx, isActive, toastsCx]);

	// MARK: - UI

	return (
		<>
			<Button
				type="button"
				variant={isSessionPrimary ? 'primary' : 'default'}
				disabled={isDisabled || pendingSessionAction != null || deleteDialog.isPending}
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
							disabled={isDisabled}
						>
							<MoreVerticalIcon />
						</Button>
					}
				/>
				<DropMenuContent side="bottom" align="end" className="w-48">
					<DropMenuItem
						variant="destructive"
						disabled={isDisabled || deleteDialog.isPending}
						onClick={deleteDialog.open}
					>
						<Trash2Icon />
						<span>Delete Intention</span>
					</DropMenuItem>
				</DropMenuContent>
			</DropMenu>
			{deleteDialog.dialog}
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
