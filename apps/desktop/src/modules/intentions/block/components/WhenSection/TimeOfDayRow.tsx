import React from 'react';
import { InputGroup, InputGroupInput, InputGroupStepper } from '@/components';
import { specta } from '@/environment';
import { addTimeOfDayMs, formatTimeInput, parseTimeInput } from '@/lib';
import { SettingsRow } from '@/modules/settings';
import { type TConditionRowsProps } from './types';

export const TimeOfDayRow: React.FC<TTimeOfDayRowProps> = (props) => {
	const {
		conditionRow: {
			condition: { timeOfDayMs, transition },
			errors: { timeOfDayMs: timeError }
		},
		formCx,
		ariaLabel,
		isDisabled = false
	} = props;

	const handleTimeChange = React.useCallback(
		(timeOfDayMs: specta.TimeOnly) => {
			formCx.updateCondition(transition, { timeOfDayMs });
		},
		[transition, formCx]
	);

	return (
		<SettingsRow
			label="Time"
			description={timeError}
			descriptionVariant={timeError != null ? 'error' : 'default'}
			variant="compact"
		>
			<TimeInput
				value={timeOfDayMs}
				onValueChange={handleTimeChange}
				ariaLabel={ariaLabel}
				isInvalid={timeError != null}
				isDisabled={isDisabled}
			/>
		</SettingsRow>
	);
};

interface TTimeOfDayRowProps extends TConditionRowsProps {
	ariaLabel: string;
}

const TimeInput: React.FC<TTimeInputProps> = (props) => {
	const { value, onValueChange, ariaLabel, isInvalid = false, isDisabled = false } = props;

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
				disabled={isDisabled}
				onChange={handleChange}
				aria-label={ariaLabel}
				aria-invalid={isInvalid}
			/>
			<InputGroupStepper
				onIncrement={handleIncrement}
				onDecrement={handleDecrement}
				incrementDisabled={isDisabled}
				decrementDisabled={isDisabled}
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
	isInvalid?: boolean;
	isDisabled?: boolean;
}

const stepMs = 5 * 60 * 1_000;
