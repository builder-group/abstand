import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { Button, ContentPage, useToastsCx } from '@/components';
import {
	BlockSection,
	NameSection,
	NewBlockIntentionCx,
	useIntentionsCx,
	WhenSection
} from '@/modules/intentions';

export const Route = createFileRoute('/window/main/_sidebar/intentions/new/block/')({
	component: RouteComponent
});

function RouteComponent() {
	const navigate = useNavigate();
	const intentionsCx = useIntentionsCx();
	const toastsCx = useToastsCx();
	const cx = React.useMemo(() => new NewBlockIntentionCx(intentionsCx), [intentionsCx]);
	const { formCx } = cx;

	const isSubmitting = useFeatureState(formCx.$form.isSubmitting);

	// MARK: - Actions

	const handleValidSubmit = React.useCallback(async () => {
		const [isIntentionOk, intentionErr, intention] = await cx.submit();
		if (!isIntentionOk) {
			switch (intentionErr.code) {
				case 'createFailed':
					toastsCx.add({
						type: 'error',
						title: 'Could not create intention',
						description: intentionErr.message
					});
					break;
				case 'startFailed':
					toastsCx.add({
						type: 'error',
						title: 'Created intention, but could not start it',
						description: intentionErr.message
					});
					void navigate({
						to: '/window/main/intentions/$intentionId',
						params: { intentionId: intentionErr.intention.id }
					});
					break;
				default:
				// do nothing
			}
			return;
		}

		void navigate({
			to: '/window/main/intentions/$intentionId',
			params: { intentionId: intention.id }
		});
	}, [cx, navigate, toastsCx]);

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
			title="Block Intention"
			subtitle="Set what gets blocked, when it runs, and how firmly it should hold."
			backTo="/window/main/intentions/new"
		>
			<form onSubmit={handleSubmit} className="space-y-5">
				<NameSection formCx={formCx} autoFocus isDisabled={isSubmitting} />
				<BlockSection formCx={formCx} isDisabled={isSubmitting} />
				<WhenSection formCx={formCx} isDisabled={isSubmitting} />

				<div className="flex justify-end">
					<Button type="submit" variant="primary" disabled={isSubmitting}>
						Create Intention
					</Button>
				</div>
			</form>
		</ContentPage>
	);
}
