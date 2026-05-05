import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useForm } from 'feature-react/form';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { Button, ContentPage, Input } from '@/components';
import { BlockModeCard, useNewIntentionCx } from '@/modules/intentions';
import { SettingsGroup, SettingsRow } from '@/modules/settings';

export const Route = createFileRoute('/window/main/_sidebar/intentions/new/block/')({
	component: RouteComponent
});

function RouteComponent() {
	const navigate = useNavigate();
	const intentionCx = useNewIntentionCx();

	const { handleSubmit, register, status } = useForm(intentionCx.$baseForm);
	const isSubmitting = useFeatureState(intentionCx.$baseForm.isSubmitting);
	const nameStatus = useFeatureState(status('name'));
	const nameError = nameStatus.type === 'INVALID' ? nameStatus.errors[0]?.message : undefined;

	// MARK: - Actions

	const handleValidSubmit = React.useCallback(async () => {
		const [isIntentionOk, , intention] = await intentionCx.submitBehavior('block');
		if (isIntentionOk) {
			void navigate({
				to: '/window/main/intentions/$intentionId',
				params: { intentionId: `${intention.id}` }
			});
		}
	}, [intentionCx, navigate]);

	// MARK: - UI

	return (
		<ContentPage
			title="Block Intention"
			subtitle="Configure your Block."
			backTo="/window/main/intentions/new"
		>
			<form onSubmit={handleSubmit({ onValidSubmit: handleValidSubmit })} className="space-y-4">
				<SettingsGroup>
					<SettingsRow
						label="Name"
						description={nameError}
						descriptionVariant={nameError != null ? 'error' : 'default'}
					>
						<Input
							{...register('name')}
							autoFocus
							placeholder="Deep work"
							aria-invalid={nameStatus.type === 'INVALID'}
						/>
					</SettingsRow>
				</SettingsGroup>

				<BlockModeCard />

				<div className="flex justify-end">
					<Button type="submit" variant="primary" disabled={isSubmitting}>
						Create Intention
					</Button>
				</div>
			</form>
		</ContentPage>
	);
}
