import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useForm } from 'feature-react/form';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { Button, ContentPage, Input, useToastsCx } from '@/components';
import { BlockSection, useNewBlockIntentionCx, WhenSection } from '@/modules/intentions';
import { SettingsGroup, SettingsRow } from '@/modules/settings';

export const Route = createFileRoute('/window/main/_sidebar/intentions/new/block/')({
	component: RouteComponent
});

function RouteComponent() {
	const navigate = useNavigate();
	const cx = useNewBlockIntentionCx();
	const toastsCx = useToastsCx();

	const { handleSubmit, register, status } = useForm(cx.$form);
	const isSubmitting = useFeatureState(cx.$form.isSubmitting);
	const nameStatus = useFeatureState(status('name'));
	const nameError = nameStatus.type === 'INVALID' ? nameStatus.errors[0]?.message : undefined;

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
				default:
				// do nothing
			}
			return;
		}

		void navigate({
			to: '/window/main/intentions/$intentionId',
			params: { intentionId: `${intention.id}` }
		});
	}, [cx, navigate, toastsCx]);

	// MARK: - UI

	return (
		<ContentPage
			title="Block Intention"
			subtitle="Set what's blocked, when it starts and ends, and how strict it is."
			backTo="/window/main/intentions/new"
		>
			<form onSubmit={handleSubmit({ onValidSubmit: handleValidSubmit })} className="space-y-5">
				<SettingsGroup>
					<SettingsRow
						label="Name"
						description={nameError}
						descriptionVariant={nameError != null ? 'error' : 'default'}
						variant={nameError != null ? 'default' : 'compact'}
					>
						<Input
							{...register('name')}
							autoFocus
							placeholder="Deep work"
							aria-invalid={nameStatus.type === 'INVALID'}
						/>
					</SettingsRow>
				</SettingsGroup>

				<BlockSection />
				<WhenSection />

				<div className="flex justify-end">
					<Button type="submit" variant="primary" disabled={isSubmitting}>
						Create Intention
					</Button>
				</div>
			</form>
		</ContentPage>
	);
}
