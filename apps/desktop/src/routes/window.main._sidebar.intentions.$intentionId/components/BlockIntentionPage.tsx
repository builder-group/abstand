import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { Button, ContentPage, useToastsCx } from '@/components';
import {
	BlockSection,
	EditBlockIntentionCx,
	NameSection,
	useIntentionsCx,
	WhenSection
} from '@/modules/intentions';
import { type TBlockIntention } from '../types';
import { IntentionActions } from './IntentionActions';

export const BlockIntentionPage: React.FC<TBlockIntentionPageProps> = (props) => {
	const { intention, isActive } = props;
	const intentionsCx = useIntentionsCx();
	const toastsCx = useToastsCx();
	const formId = React.useId();
	const cx = React.useMemo(
		() => new EditBlockIntentionCx(intentionsCx, intention),
		[intentionsCx, intention]
	);
	const { formCx } = cx;
	const isDirty = useFeatureState(formCx.$form.isDirty);
	const isSubmitting = useFeatureState(formCx.$form.isSubmitting);
	const shouldShowSaveButton = isDirty || isSubmitting;

	// MARK: - Actions

	const handleValidSubmit = React.useCallback(async () => {
		const [isIntentionOk, intentionErr] = await cx.save();
		if (!isIntentionOk) {
			if (intentionErr.code === 'updateFailed') {
				toastsCx.add({
					type: 'error',
					title: 'Could not save intention',
					description: intentionErr.message
				});
			}
			return;
		}

		toastsCx.add({
			type: 'success',
			title: 'Saved intention'
		});
	}, [cx, toastsCx]);

	const handleSubmit = React.useCallback(
		(event: React.FormEvent<HTMLFormElement>) => {
			event.preventDefault();
			void formCx.$form.submit({
				onValidSubmit: handleValidSubmit,
				context: { event }
			});
		},
		[formCx, handleValidSubmit]
	);

	// MARK: - UI

	return (
		<ContentPage
			title={intention.name}
			subtitle="Block Intention"
			trailing={
				<>
					{shouldShowSaveButton && (
						<Button type="submit" form={formId} variant="primary" disabled={isSubmitting}>
							Save
						</Button>
					)}
					<IntentionActions
						intention={intention}
						isActive={isActive}
						isDisabled={isSubmitting}
						isSessionPrimary={!isActive && !shouldShowSaveButton}
					/>
				</>
			}
		>
			<form id={formId} onSubmit={handleSubmit} className="space-y-5">
				<NameSection formCx={formCx} isDisabled={isSubmitting} />
				<BlockSection formCx={formCx} isDisabled={isSubmitting} />
				<WhenSection formCx={formCx} isDisabled={isSubmitting} />
			</form>
		</ContentPage>
	);
};

interface TBlockIntentionPageProps {
	intention: TBlockIntention;
	isActive: boolean;
}
