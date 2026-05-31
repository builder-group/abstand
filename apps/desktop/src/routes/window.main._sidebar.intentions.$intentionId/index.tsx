import { createFileRoute } from '@tanstack/react-router';
import { useCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import * as z from 'zod';
import {
	Button,
	ContentPage,
	DropMenu,
	DropMenuContent,
	DropMenuItem,
	DropMenuTrigger,
	MoreVerticalIcon,
	Spinner,
	Trash2Icon,
	useToastsCx
} from '@/components';
import { type specta } from '@/environment';
import { useIntentionsCx } from '@/modules/intentions';
import { useIntentionDeleteDialog } from './components';

export const Route = createFileRoute('/window/main/_sidebar/intentions/$intentionId/')({
	params: {
		parse: (params) => {
			const result = SIntentionRouteParams.safeParse(params);
			return result.success ? result.data : false;
		},
		stringify: (params) => ({
			intentionId: String(params.intentionId)
		})
	},
	component: RouteComponent
});

const SIntentionRouteParams = z.object({
	// Note: Use regex + Number instead of coercion so only positive decimal path segments match
	intentionId: z
		.string()
		.regex(/^[1-9]\d*$/)
		.transform(Number)
});

function RouteComponent() {
	const { intentionId } = Route.useParams();
	const intentionsCx = useIntentionsCx();
	const hasLoaded = useFeatureState(intentionsCx.$hasLoaded);
	const intention = useFeatureState(intentionsCx.getIntentionState(intentionId));
	const isActive = useCompute(
		intentionsCx.getActiveSessionState(intentionId),
		(activeSession) => activeSession?.status === 'active'
	);

	// MARK: - UI

	if (intention == null && !hasLoaded) {
		return (
			<ContentPage title="Loading intention" subtitle={`ID ${intentionId}`}>
				<div className="text-base-400 flex items-center gap-2 text-sm">
					<Spinner />
					<span>Loading intention...</span>
				</div>
			</ContentPage>
		);
	}

	if (intention == null) {
		return <ContentPage title="Intention not found" subtitle={`ID ${intentionId}`} />;
	}

	return (
		<ContentPage
			title={intention.name}
			subtitle={getIntentionBehaviorSubtitle(intention.behavior)}
			trailing={<IntentionActions intention={intention} isActive={isActive} />}
		>
			<p className="text-base-500 text-sm">Hello intention #{intention.id}</p>
			<div className="h-500 w-full bg-red-100" />
		</ContentPage>
	);
}

function getIntentionBehaviorSubtitle(behavior: specta.IntentionBehavior): string {
	switch (behavior.type) {
		case 'block':
			return 'Block Intention';
		case 'break':
			return 'Break Intention';
	}
}

const IntentionActions: React.FC<TIntentionActionsProps> = (props) => {
	const { intention, isActive } = props;
	const intentionsCx = useIntentionsCx();
	const toastsCx = useToastsCx();
	const deleteDialog = useIntentionDeleteDialog({ intention, isActive });
	const [pendingPrimaryAction, setPendingPrimaryAction] =
		React.useState<TPendingPrimaryAction | null>(null);

	const isPrimaryPending = pendingPrimaryAction != null;

	// MARK: - Actions

	const handlePrimaryAction = React.useCallback(async () => {
		if (isActive) {
			setPendingPrimaryAction('stop');
			const [isSessionOk, sessionErr] = await intentionsCx.stop(intention.id);
			setPendingPrimaryAction(null);

			if (!isSessionOk) {
				toastsCx.add({
					type: 'error',
					title: 'Could not cancel intention',
					description: sessionErr
				});
			}
			return;
		}

		setPendingPrimaryAction('start');
		const [isSessionOk, sessionErr] = await intentionsCx.start(intention.id);
		setPendingPrimaryAction(null);

		if (!isSessionOk) {
			toastsCx.add({
				type: 'error',
				title: 'Could not begin intention',
				description: sessionErr
			});
		}
	}, [intention.id, intentionsCx, isActive, toastsCx]);

	// MARK: - UI

	return (
		<>
			<div className="flex items-center gap-2">
				<Button
					type="button"
					variant={isActive ? 'destructive' : 'primary'}
					disabled={isPrimaryPending || deleteDialog.isPending}
					onClick={handlePrimaryAction}
				>
					{isActive ? 'Cancel' : 'Begin'}
				</Button>

				<DropMenu>
					<DropMenuTrigger
						render={
							<Button
								type="button"
								aria-label="More intention actions"
								variant="ghost"
								size="icon-sm"
							>
								<MoreVerticalIcon />
							</Button>
						}
					/>
					<DropMenuContent side="bottom" align="end" className="w-48">
						<DropMenuItem
							variant="destructive"
							disabled={deleteDialog.isPending}
							onClick={deleteDialog.open}
						>
							<Trash2Icon />
							<span>Delete Intention</span>
						</DropMenuItem>
					</DropMenuContent>
				</DropMenu>
			</div>
			{deleteDialog.dialog}
		</>
	);
};

interface TIntentionActionsProps {
	intention: specta.Intention;
	isActive: boolean;
}

type TPendingPrimaryAction = 'start' | 'stop';
