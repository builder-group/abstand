import React from 'react';
import { InputGroup, InputGroupInput, InputGroupStepper } from '@/components';
import { specta } from '@/environment';
import { addTimeOfDayMs, formatTimeInput, parseTimeInput } from '@/lib';
import { SettingsRow } from '@/modules/settings';
import { type TConditionRowsProps } from './types';

export const TimeOfDayRow: React.FC<TTimeOfDayRowProps> = (props) => {
	const { condition, cx, ariaLabel } = props;

	const handleTimeChange = React.useCallback(
		(timeOfDayMs: specta.TimeOnly) => {
			cx.updateCondition(condition.transition, { timeOfDayMs });
		},
		[condition.transition, cx]
	);

	return (
		<SettingsRow label="Time" variant="compact">
			<TimeInput
				value={condition.timeOfDayMs}
				onValueChange={handleTimeChange}
				ariaLabel={ariaLabel}
			/>
		</SettingsRow>
	);
};

interface TTimeOfDayRowProps extends TConditionRowsProps {
	ariaLabel: string;
}

const TimeInput: React.FC<TTimeInputProps> = (props) => {
	const { value, onValueChange, ariaLabel } = props;

	const handleChange = React.useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const timeOfDayMs = parseTimeInput(event.target.value);
			if (timeOfDayMs == null) {
				return;
			}

			onValueChange(timeOfDayMs);
		},
		[onValueChange]
	);

	const handleIncrement = React.useCallback(() => {
		onValueChange(addTimeOfDayMs(value, stepMs));
	}, [onValueChange, value]);

	const handleDecrement = React.useCallback(() => {
		onValueChange(addTimeOfDayMs(value, -stepMs));
	}, [onValueChange, value]);

	return (
		<InputGroup className="w-25">
			<InputGroupInput
				type="time"
				step={stepMs / 1_000}
				value={formatTimeInput(value)}
				onChange={handleChange}
				aria-label={ariaLabel}
			/>
			<InputGroupStepper
				onIncrement={handleIncrement}
				onDecrement={handleDecrement}
				incrementLabel="Increase time"
				decrementLabel="Decrease time"
			/>
		</InputGroup>
	);
};

interface TTimeInputProps {
	value: specta.TimeOnly;
	onValueChange: (value: specta.TimeOnly) => void;
	ariaLabel: string;
}

const stepMs = 5 * 60 * 1_000;
