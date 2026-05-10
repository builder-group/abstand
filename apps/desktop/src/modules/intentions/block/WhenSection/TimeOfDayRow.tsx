import React from 'react';
import { InputGroup, InputGroupInput, InputGroupStepper } from '@/components';
import { SettingsRow } from '@/modules/settings';
import { type TConditionRowsProps } from './types';

export const TimeOfDayRow: React.FC<TTimeOfDayRowProps> = (props) => {
	const { condition, cx, ariaLabel } = props;

	const handleTimeChange = React.useCallback(
		(timeOfDay: string) => {
			cx.updateCondition(condition.phase, { timeOfDay });
		},
		[condition.phase, cx]
	);

	return (
		<SettingsRow label="Time" variant="compact">
			<TimeInput
				value={condition.timeOfDay}
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
			onValueChange(event.target.value);
		},
		[onValueChange]
	);

	const handleIncrement = React.useCallback(() => {
		onValueChange(stepTimeOfDay(value, stepMinutes));
	}, [onValueChange, value]);

	const handleDecrement = React.useCallback(() => {
		onValueChange(stepTimeOfDay(value, -stepMinutes));
	}, [onValueChange, value]);

	return (
		<InputGroup className="w-25">
			<InputGroupInput
				type="time"
				step={stepMinutes * 60}
				value={value}
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
	value: string;
	onValueChange: (value: string) => void;
	ariaLabel: string;
}

const stepMinutes = 5;

function stepTimeOfDay(timeOfDay: string, deltaMinutes: number): string {
	const match = /^(\d{2}):(\d{2})$/.exec(timeOfDay);
	if (match == null) {
		return timeOfDay;
	}

	const hours = Number(match[1]);
	const minutes = Number(match[2]);
	if (hours >= 24 || minutes >= 60) {
		return timeOfDay;
	}

	const totalMinutes = hours * 60 + minutes;
	const nextTotalMinutes = (totalMinutes + deltaMinutes + 1440) % 1440;
	const nextHours = Math.floor(nextTotalMinutes / 60);
	const nextMinutes = nextTotalMinutes % 60;

	return `${String(nextHours).padStart(2, '0')}:${String(nextMinutes).padStart(2, '0')}`;
}
