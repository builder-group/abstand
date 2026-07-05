import { useCompute } from 'feature-react/state';
import React from 'react';
import { Select } from '@/components';
import { type specta } from '@/environment';
import {
	SettingsGroup,
	SettingsRow,
	type TSettingsRowDescriptionVariant
} from '@/modules/settings';
import {
	type BlockIntentionFormCx,
	type TBlockIntentionConditionFormData,
	type TBlockIntentionConditionMode
} from '../../BlockIntentionFormCx';
import { ConditionDetailRows } from './ConditionDetailRows';
import { type TConditionRow } from './types';
import { useConditionRow } from './use-condition-row';

export const WhenSection: React.FC<TWhenSectionProps> = (props) => {
	const { formCx, isActive = false, isDisabled = false } = props;
	const hasChangedStartCondition = useCompute(
		[formCx.$form.fields.conditions, formCx.$form.dirtyFields] as const,
		([conditions, dirtyFields]) => {
			if (!dirtyFields.conditions) {
				return false;
			}

			const startCondition = conditions.find((condition) => condition.transition === 'start');
			const defaultStartCondition = formCx.$form.fields.conditions.defaultValue.find(
				(condition) => condition.transition === 'start'
			);

			return !areStartConditionsEqual(startCondition, defaultStartCondition);
		},
		[formCx]
	);
	const shouldShowActiveEditDescriptions =
		formCx.mode === 'edit' && isActive && hasChangedStartCondition;

	return (
		<div className="space-y-2.5">
			<SettingsGroup title="When">
				<ConditionRowSet
					transition="start"
					label="Starts"
					description={
						shouldShowActiveEditDescriptions
							? 'Applies next time this Intention starts.'
							: undefined
					}
					descriptionVariant={shouldShowActiveEditDescriptions ? 'info' : 'default'}
					formCx={formCx}
					isDisabled={isDisabled}
				/>
			</SettingsGroup>

			<SettingsGroup>
				<ConditionRowSet transition="end" label="Ends" formCx={formCx} isDisabled={isDisabled} />
			</SettingsGroup>
		</div>
	);
};

interface TWhenSectionProps {
	formCx: BlockIntentionFormCx;
	isActive?: boolean;
	isDisabled?: boolean;
}

function areStartConditionsEqual(
	a: TBlockIntentionConditionFormData | undefined,
	b: TBlockIntentionConditionFormData | undefined
): boolean {
	if (a == null || b == null) {
		return a == null && b == null;
	}
	if (a.mode !== b.mode) {
		return false;
	}

	switch (a.mode) {
		case 'atTime':
			return a.dateEpochDays === b.dateEpochDays && a.timeOfDayMs === b.timeOfDayMs;
		case 'afterDelay':
		case 'afterDuration':
			return a.offsetMs === b.offsetMs;
		case 'repeats':
			return a.timeOfDayMs === b.timeOfDayMs && a.weekdaysMask === b.weekdaysMask;
		case 'manual':
		case 'now':
			return true;
	}
}

const ConditionRowSet: React.FC<TConditionRowSetProps> = (props) => {
	const { transition, label, description, descriptionVariant, formCx, isDisabled = false } = props;
	const conditionRow = useConditionRow(formCx, transition);

	return (
		<>
			<ConditionModeRow
				conditionRow={conditionRow}
				formCx={formCx}
				label={label}
				description={description}
				descriptionVariant={descriptionVariant}
				isDisabled={isDisabled}
			/>
			<ConditionDetailRows formCx={formCx} conditionRow={conditionRow} isDisabled={isDisabled} />
		</>
	);
};

interface TConditionRowSetProps {
	transition: specta.IntentionConditionTransition;
	label: string;
	description?: React.ReactNode;
	descriptionVariant?: TSettingsRowDescriptionVariant;
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
		descriptionVariant,
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
		<SettingsRow
			label={label}
			description={description}
			descriptionVariant={descriptionVariant}
			variant="compact"
		>
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
	description?: React.ReactNode;
	descriptionVariant?: TSettingsRowDescriptionVariant;
	isDisabled?: boolean;
}
