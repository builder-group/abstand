import { useCombinedCompute } from 'feature-react/state';
import React from 'react';
import { Select } from '@/components';
import { type specta } from '@/environment';
import { getFirstFormFieldStatusError } from '@/lib';
import { SettingsGroup, SettingsRow } from '@/modules/settings';
import {
	useNewBlockIntentionCx,
	type NewBlockIntentionCx,
	type TNewIntentionConditionMode
} from '../NewBlockIntentionCx';
import { ConditionDetailRows } from './ConditionDetailRows';

export const WhenSection: React.FC = () => {
	const cx = useNewBlockIntentionCx();

	return (
		<div className="space-y-2.5">
			<SettingsGroup title="When">
				<ConditionRowSet transition="start" label="Starts" cx={cx} />
			</SettingsGroup>

			<SettingsGroup>
				<ConditionRowSet transition="end" label="Ends" cx={cx} />
			</SettingsGroup>
		</div>
	);
};

const ConditionRowSet: React.FC<TConditionRowSetProps> = (props) => {
	const { transition, label, description, cx } = props;
	const conditionRow = useCombinedCompute(
		[cx.$form.fields.conditions, cx.$form.fields.conditions.status] as const,
		([{ value: conditions }, { value: conditionsStatus }]) => {
			const index = conditions?.findIndex((condition) => condition.transition === transition) ?? -1;
			const condition = conditions?.[index] ?? null;
			if (condition == null) {
				return null;
			}

			const error = getFirstFormFieldStatusError(conditionsStatus, `${index}`, {
				includeNested: true
			})?.message;

			return { condition, error };
		},
		[transition],
		{
			isEqual: (a, b) => {
				if (a == null || b == null) {
					return a === b;
				}

				return a.condition === b.condition && a.error === b.error;
			}
		}
	);
	const modeOptions = modeOptionsByTransition[transition];

	// MARK: - Actions

	const handleModeChange = React.useCallback(
		(event: React.ChangeEvent<HTMLSelectElement>) => {
			cx.setConditionMode(transition, event.target.value as TNewIntentionConditionMode);
		},
		[cx, transition]
	);

	// MARK: - UI

	if (conditionRow == null) {
		return null;
	}

	const { condition, error: conditionError } = conditionRow;

	return (
		<>
			<SettingsRow
				label={label}
				description={conditionError ?? description}
				descriptionVariant={conditionError != null ? 'error' : 'default'}
				variant="compact"
			>
				<Select
					variant="ghost"
					value={condition.mode}
					onChange={handleModeChange}
					aria-invalid={conditionError != null}
				>
					{modeOptions.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</Select>
			</SettingsRow>

			<ConditionDetailRows condition={condition} cx={cx} />
		</>
	);
};

interface TConditionRowSetProps {
	transition: specta.IntentionConditionTransition;
	label: string;
	description?: string;
	cx: NewBlockIntentionCx;
}

const modeOptionsByTransition = {
	start: [
		{ value: 'now', label: 'Start now' },
		{ value: 'atTime', label: 'At time' },
		{ value: 'afterDelay', label: 'After delay' },
		{ value: 'repeats', label: 'Repeats' },
		{ value: 'manual', label: 'Manually' }
	],
	end: [
		{ value: 'afterDuration', label: 'After duration' },
		{ value: 'atTime', label: 'At time' },
		{ value: 'manual', label: 'Manually' }
	]
} as const satisfies Record<specta.IntentionConditionTransition, TConditionModeOption[]>;

interface TConditionModeOption {
	value: TNewIntentionConditionMode;
	label: string;
}
