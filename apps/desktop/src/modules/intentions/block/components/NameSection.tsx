import { useFormField } from 'feature-react/form';
import React from 'react';
import { Input } from '@/components';
import { SettingsGroup, SettingsRow } from '@/modules/settings';
import { type BlockIntentionFormCx } from '../BlockIntentionFormCx';

export const NameSection: React.FC<TNameSectionProps> = (props) => {
	const { formCx, autoFocus = false, isDisabled = false } = props;
	const nameField = useFormField(formCx.$form, 'name', { controlled: true });
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
					autoFocus={autoFocus}
					disabled={isDisabled}
					placeholder="Deep work"
					aria-invalid={nameField.status.type === 'invalid'}
				/>
			</SettingsRow>
		</SettingsGroup>
	);
};

interface TNameSectionProps {
	formCx: BlockIntentionFormCx;
	autoFocus?: boolean;
	isDisabled?: boolean;
}
