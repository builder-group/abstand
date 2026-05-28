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
import { type TConditionRow } from './types';
import { useConditionRow } from './use-condition-row';

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
	const conditionRow = useConditionRow(cx, transition);

	return (
		<>
			<ConditionModeRow
				conditionRow={conditionRow}
				cx={cx}
				label={label}
				description={description}
			/>
			<ConditionDetailRows cx={cx} conditionRow={conditionRow} />
		</>
	);
};

interface TConditionRowSetProps {
	transition: specta.IntentionConditionTransition;
	label: string;
	description?: string;
	cx: NewBlockIntentionCx;
}

const ConditionModeRow: React.FC<TConditionModeRowProps> = (props) => {
	const {
		conditionRow: {
			condition: { mode, transition }
		},
		cx,
		label,
		description
	} = props;

	const handleModeChange = React.useCallback(
		(event: React.ChangeEvent<HTMLSelectElement>) => {
			cx.setConditionMode(transition, event.target.value as TNewIntentionConditionMode);
		},
		[cx, transition]
	);

	// MARK: - UI

	return (
		<SettingsRow label={label} description={description} variant="compact">
			<Select variant="ghost" value={mode} onChange={handleModeChange}>
				{modeOptionsByTransition[transition].map((option) => (
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
	cx: NewBlockIntentionCx;
	label: string;
	description?: string;
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
