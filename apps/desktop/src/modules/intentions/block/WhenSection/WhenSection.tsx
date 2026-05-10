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
				<ConditionRowSet
					phase="start"
					label="Starts"
					description="Choose when this Abstand begins."
					cx={cx}
				/>
			</SettingsGroup>

			<SettingsGroup>
				<ConditionRowSet
					phase="end"
					label="Ends"
					description="Choose when this Abstand releases."
					cx={cx}
				/>
			</SettingsGroup>
		</div>
	);
};

const ConditionRowSet: React.FC<TConditionRowSetProps> = (props) => {
	const { phase, label, description, cx } = props;
	const condition = useCompute(
		cx.$form.fields.conditions,
		({ value }) => value?.find((c) => c.phase === phase) ?? null
	);
	const modeOptions = modeOptionsByPhase[phase];

	// MARK: - Actions

	const handleModeChange = React.useCallback(
		(event: React.ChangeEvent<HTMLSelectElement>) => {
			cx.setConditionMode(phase, event.target.value as TNewIntentionConditionMode);
		},
		[cx, phase]
	);

	// MARK: - UI

	if (condition == null) {
		return null;
	}

	return (
		<>
			<SettingsRow label={label} description={description}>
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
	phase: specta.IntentionConditionPhase;
	label: string;
	description: string;
	cx: NewBlockIntentionCx;
}

const modeOptionsByPhase = {
	start: [
		{ value: 'now', label: 'Now' },
		{ value: 'atTime', label: 'At time' },
		{ value: 'inTime', label: 'In time' },
		{ value: 'repeats', label: 'Repeats' },
		{ value: 'manual', label: 'Manual' }
	],
	end: [
		{ value: 'inTime', label: 'In time' },
		{ value: 'atTime', label: 'At time' },
		{ value: 'repeats', label: 'Repeats' },
		{ value: 'manual', label: 'Manual' }
	]
} as const satisfies Record<specta.IntentionConditionPhase, TConditionModeOption[]>;

interface TConditionModeOption {
	value: TNewIntentionConditionMode;
	label: string;
}
