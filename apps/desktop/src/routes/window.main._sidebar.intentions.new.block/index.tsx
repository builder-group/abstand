import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useFormField } from 'feature-react/form';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { Button, ContentPage, Input, useToastsCx } from '@/components';
import {
	BlockSection,
	useNewBlockIntentionCx,
	WhenSection,
	type NewBlockIntentionCx
} from '@/modules/intentions';
import { SettingsGroup, SettingsRow } from '@/modules/settings';

export const Route = createFileRoute('/window/main/_sidebar/intentions/new/block/')({
	component: RouteComponent
});

function RouteComponent() {
	const navigate = useNavigate();
	const cx = useNewBlockIntentionCx();
	const toastsCx = useToastsCx();

	const isSubmitting = useFeatureState(cx.$form.isSubmitting);

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
						params: { intentionId: `${intentionErr.intention.id}` }
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

	const handleSubmit = React.useCallback(
		(event: React.FormEvent<HTMLFormElement>) => {
			event.preventDefault();
			void cx.$form.submit({
				onValidSubmit: handleValidSubmit,
				context: { event }
			});
		},
		[cx, handleValidSubmit]
	);

	// MARK: - UI

	return (
		<ContentPage
			title="Block Intention"
			subtitle="Set what's blocked, when it starts and ends, and how strict it is."
			backTo="/window/main/intentions/new"
		>
			<form onSubmit={handleSubmit} className="space-y-5">
				<NameSection cx={cx} />
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

const NameSection: React.FC<TNameSectionProps> = (props) => {
	const { cx } = props;
	const nameField = useFormField(cx.$form, 'name');
	const nameError =
		nameField.status.type === 'invalid' ? nameField.status.errors[0]?.message : undefined;

	return (
		<SettingsGroup>
			<SettingsRow
				label="Name"
				description={nameError}
				descriptionVariant={nameError != null ? 'error' : 'default'}
				variant={nameError != null ? 'default' : 'compact'}
			>
				<Input
					{...nameField.input()}
					autoFocus
					placeholder="Deep work"
					aria-invalid={nameField.status.type === 'invalid'}
				/>
			</SettingsRow>
		</SettingsGroup>
	);
};

interface TNameSectionProps {
	cx: NewBlockIntentionCx;
}
