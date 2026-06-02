import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { Button, ButtonGroup, ContentPage, Tooltip, Undo2Icon } from '@/components';
import {
	BlockSection,
	EditBlockIntentionCx,
	NameSection,
	useIntentionsCx,
	WhenSection
} from '@/modules/intentions';
import { type TBlockIntention } from '../types';
import { IntentionActions } from './IntentionActions';
import { useIntentionSaveDialog } from './IntentionSaveDialog';

export const BlockIntentionPage: React.FC<TBlockIntentionPageProps> = (props) => {
	const { intention, isActive } = props;
	const intentionsCx = useIntentionsCx();
	const formId = React.useId();
	const cx = React.useMemo(
		() => new EditBlockIntentionCx(intentionsCx, intention),
		[intentionsCx, intention]
	);
	const { formCx } = cx;
	const isDirty = useFeatureState(formCx.$form.isDirty);
	const isSubmitting = useFeatureState(formCx.$form.isSubmitting);
	const resetRevision = useFeatureState(formCx.$resetRevision);

	const {
		dialog: saveDialog,
		isPending: isSaving,
		save: saveIntention
	} = useIntentionSaveDialog({
		cx,
		intention,
		isActive
	});
	const isPending = isSubmitting || isSaving;
	const shouldShowEditActions = isDirty || isPending;

	// MARK: - Actions

	const handleDiscard = React.useCallback(() => {
		formCx.resetToIntention(intention);
	}, [formCx, intention]);

	const handleSubmit = React.useCallback(
		(event: React.FormEvent<HTMLFormElement>) => {
			event.preventDefault();
			void formCx.$form.submit({
				onValidSubmit: saveIntention,
				context: { event }
			});
		},
		[formCx, saveIntention]
	);

	// MARK: - UI

	return (
		<>
			<ContentPage
				title={intention.name}
				subtitle="Block Intention"
				trailing={
					<IntentionActions
						intention={intention}
						isActive={isActive}
						isDisabled={isPending}
						isSessionPrimary={!isActive && !shouldShowEditActions}
						leading={
							shouldShowEditActions && (
								<ButtonGroup>
									<Button type="submit" form={formId} variant="primary" disabled={isPending}>
										{isPending ? 'Saving' : 'Save'}
									</Button>
									{isDirty && (
										<Tooltip content="Discard changes">
											<Button
												type="button"
												size="icon-sm"
												aria-label="Discard changes"
												disabled={isPending}
												onClick={handleDiscard}
											>
												<Undo2Icon />
											</Button>
										</Tooltip>
									)}
								</ButtonGroup>
							)
						}
					/>
				}
			>
				<form
					key={resetRevision}
					id={formId}
					onSubmit={handleSubmit}
					// Note: Use inert instead of disabling section inputs so quick saves do not flicker fields
					inert={isPending}
					aria-busy={isPending}
					className="space-y-5"
				>
					<NameSection formCx={formCx} />
					<BlockSection formCx={formCx} />
					<WhenSection formCx={formCx} />
				</form>
			</ContentPage>
			{saveDialog}
		</>
	);
};

interface TBlockIntentionPageProps {
	intention: TBlockIntention;
	isActive: boolean;
}
