import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { Button, ContentPage, useToastsCx } from '@/components';
import {
	BlockSection,
	EditBlockIntentionCx,
	getIntentionActionPolicy,
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
	const toastsCx = useToastsCx();
	const formId = React.useId();
	const [isSaving, setIsSaving] = React.useState(false);
	const cx = React.useMemo(
		() => new EditBlockIntentionCx(intentionsCx, intention),
		[intentionsCx, intention]
	);
	const { formCx } = cx;
	const isDirty = useFeatureState(formCx.$form.isDirty);
	const isSubmitting = useFeatureState(formCx.$form.isSubmitting);
	const isPending = isSubmitting || isSaving;
	const shouldShowSaveButton = isDirty || isPending;
	const savePolicy = getIntentionActionPolicy(intention, { isActive });

	const { dialog: saveDialog, open: openSaveDialog } = useIntentionSaveDialog({
		intention,
		policy: savePolicy,
		isPending,
		onSave: () => saveIntention()
	});

	// MARK: - Actions

	const saveIntention = React.useCallback(async (): Promise<boolean> => {
		setIsSaving(true);
		try {
			const [isIntentionOk, intentionErr] = await cx.save();
			if (!isIntentionOk) {
				if (intentionErr.code === 'updateFailed') {
					toastsCx.add({
						type: 'error',
						title: 'Could not save intention',
						description: intentionErr.message
					});
				}
				return false;
			}

			toastsCx.add({
				type: 'success',
				title: 'Saved intention'
			});
			return true;
		} finally {
			setIsSaving(false);
		}
	}, [cx, toastsCx]);

	const handleSubmit = React.useCallback(
		(event: React.FormEvent<HTMLFormElement>) => {
			event.preventDefault();
			void formCx.$form.submit({
				onValidSubmit: async () => {
					if (savePolicy.type === 'available') {
						await saveIntention();
						return;
					}

					openSaveDialog();
				},
				context: { event }
			});
		},
		[formCx, openSaveDialog, saveIntention, savePolicy.type]
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
