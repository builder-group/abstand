import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { Button, ContentPage } from '@/components';
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
	const shouldShowSaveButton = isDirty || isPending;

	// MARK: - Actions

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
					<>
						{shouldShowSaveButton && (
							<Button type="submit" form={formId} variant="primary" disabled={isPending}>
								Save
							</Button>
						)}
						<IntentionActions
							intention={intention}
							isActive={isActive}
							isDisabled={isPending}
							isSessionPrimary={!isActive && !shouldShowSaveButton}
						/>
					</>
				}
			>
				<form id={formId} onSubmit={handleSubmit} className="space-y-5">
					<NameSection formCx={formCx} isDisabled={isPending} />
					<BlockSection formCx={formCx} isDisabled={isPending} />
					<WhenSection formCx={formCx} isDisabled={isPending} />
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
