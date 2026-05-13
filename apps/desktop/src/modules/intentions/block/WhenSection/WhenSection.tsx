import { useCompute } from 'feature-react/state';
import React from 'react';
import { Select } from '@/components';
import { type specta } from '@/environment';
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
	const condition = useCompute(
		cx.$form.fields.conditions,
		({ value }) => value?.find((c) => c.transition === transition) ?? null
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

	if (condition == null) {
		return null;
	}

	return (
		<>
			<SettingsRow label={label} description={description} variant="compact">
				<Select variant="ghost" value={condition.mode} onChange={handleModeChange}>
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
		{ value: 'now', label: 'Now' },
		{ value: 'atTime', label: 'At time' },
		{ value: 'afterDelay', label: 'After delay' },
		{ value: 'repeats', label: 'Repeats' },
		{ value: 'manual', label: 'Manually' }
	],
	end: [
		{ value: 'afterDuration', label: 'After duration' },
		{ value: 'atTime', label: 'At time' },
		{ value: 'repeats', label: 'Repeats' },
		{ value: 'manual', label: 'Manually' }
	]
} as const satisfies Record<specta.IntentionConditionTransition, TConditionModeOption[]>;

interface TConditionModeOption {
	value: TNewIntentionConditionMode;
	label: string;
}
