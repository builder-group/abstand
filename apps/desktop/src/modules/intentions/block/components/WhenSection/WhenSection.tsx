import React from 'react';
import { Select } from '@/components';
import { type specta } from '@/environment';
import { SettingsGroup, SettingsRow } from '@/modules/settings';
import {
	type BlockIntentionFormCx,
	type TBlockIntentionConditionMode
} from '../../BlockIntentionFormCx';
import { ConditionDetailRows } from './ConditionDetailRows';
import { type TConditionRow } from './types';
import { useConditionRow } from './use-condition-row';

export const WhenSection: React.FC<TWhenSectionProps> = (props) => {
	const { formCx, isActive = false, isDisabled = false } = props;
	const shouldShowActiveEditDescriptions = formCx.mode === 'edit' && isActive;

	return (
		<div className="space-y-2.5">
			<SettingsGroup title="When">
				<ConditionRowSet
					transition="start"
					label="Starts"
					description={shouldShowActiveEditDescriptions ? 'Applies to future sessions' : undefined}
					formCx={formCx}
					isDisabled={isDisabled}
				/>
			</SettingsGroup>

			<SettingsGroup>
				<ConditionRowSet
					transition="end"
					label="Ends"
					description={shouldShowActiveEditDescriptions ? 'Can affect this session' : undefined}
					formCx={formCx}
					isDisabled={isDisabled}
				/>
			</SettingsGroup>
		</div>
	);
};

interface TWhenSectionProps {
	formCx: BlockIntentionFormCx;
	isActive?: boolean;
	isDisabled?: boolean;
}

const ConditionRowSet: React.FC<TConditionRowSetProps> = (props) => {
	const { transition, label, description, formCx, isDisabled = false } = props;
	const conditionRow = useConditionRow(formCx, transition);

	return (
		<>
			<ConditionModeRow
				conditionRow={conditionRow}
				formCx={formCx}
				label={label}
				description={description}
				isDisabled={isDisabled}
			/>
			<ConditionDetailRows formCx={formCx} conditionRow={conditionRow} isDisabled={isDisabled} />
		</>
	);
};

interface TConditionRowSetProps {
	transition: specta.IntentionConditionTransition;
	label: string;
	description?: string;
	formCx: BlockIntentionFormCx;
	isDisabled?: boolean;
}

const ConditionModeRow: React.FC<TConditionModeRowProps> = (props) => {
	const {
		conditionRow: {
			condition: { mode, transition }
		},
		formCx,
		label,
		description,
		isDisabled = false
	} = props;
	const modeOptions = formCx.getConditionModeOptions(transition);

	const handleModeChange = React.useCallback(
		(event: React.ChangeEvent<HTMLSelectElement>) => {
			formCx.setConditionMode(transition, event.target.value as TBlockIntentionConditionMode);
		},
		[formCx, transition]
	);

	// MARK: - UI

	return (
		<SettingsRow label={label} description={description} variant="compact">
			<Select variant="ghost" value={mode} disabled={isDisabled} onChange={handleModeChange}>
				{modeOptions.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</Select>
		</SettingsRow>
	);
};

interface TConditionModeRowProps {
	conditionRow: TConditionRow;
	formCx: BlockIntentionFormCx;
	label: string;
	description?: string;
	isDisabled?: boolean;
}
