import React from 'react';
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupStepper,
	Select
} from '@/components';
import { clampNumber } from '@/lib';
import { SettingsRow } from '@/modules/settings';
import { type TConditionRowsProps } from './types';

export const AfterOffsetRows: React.FC<TConditionRowsProps> = (props) => {
	const { condition, cx } = props;
	const [isCustomDurationSelected, setIsCustomDurationSelected] = React.useState(false);

	const selectedDurationValue = isCustomDurationSelected
		? customDurationValue
		: (durationOptions.find((o) => o.minutes === condition.offsetMinutes)?.minutes.toString() ??
			customDurationValue);

	// MARK: - Actions

	const handleOffsetMinutesChange = React.useCallback(
		(offsetMinutes: number) => {
			cx.updateCondition(condition.phase, {
				offsetMinutes: clampOffsetMinutes(offsetMinutes)
			});
		},
		[condition.phase, cx]
	);

	const handleDurationChange = React.useCallback(
		(event: React.ChangeEvent<HTMLSelectElement>) => {
			if (event.target.value === customDurationValue) {
				setIsCustomDurationSelected(true);
				return;
			}

			const offsetMinutes = Number(event.target.value);
			if (!Number.isFinite(offsetMinutes)) {
				return;
			}

			setIsCustomDurationSelected(false);
			handleOffsetMinutesChange(offsetMinutes);
		},
		[handleOffsetMinutesChange]
	);

	// MARK: - UI

	return (
		<SettingsRow
			label="After"
			variant="compact"
			contentClassName="min-w-0 shrink flex-wrap justify-end"
		>
			<Select variant="ghost" value={selectedDurationValue} onChange={handleDurationChange}>
				{durationOptions.map((option) => (
					<option key={option.minutes} value={option.minutes}>
						{option.label}
					</option>
				))}
				<option value={customDurationValue}>Custom</option>
			</Select>
			{selectedDurationValue === customDurationValue && (
				<CustomDurationInputs
					offsetMinutes={condition.offsetMinutes}
					onOffsetMinutesChange={handleOffsetMinutesChange}
				/>
			)}
		</SettingsRow>
	);
};

const durationOptions = [
	{ minutes: 20, label: '20 minutes' },
	{ minutes: 30, label: '30 minutes' },
	{ minutes: 45, label: '45 minutes' },
	{ minutes: 60, label: '1 hour' }
] as const;
const customDurationValue = 'custom';

const CustomDurationInputs: React.FC<TCustomDurationInputsProps> = (props) => {
	const { offsetMinutes, onOffsetMinutesChange } = props;
	const hours = Math.floor(offsetMinutes / 60);
	const minutes = offsetMinutes % 60;

	// MARK: - Actions

	const handleHoursChange = React.useCallback(
		(nextHours: number) => {
			onOffsetMinutesChange(getDurationMinutes(nextHours, minutes));
		},
		[minutes, onOffsetMinutesChange]
	);

	const handleMinutesChange = React.useCallback(
		(nextMinutes: number) => {
			onOffsetMinutesChange(getDurationMinutes(hours, nextMinutes));
		},
		[hours, onOffsetMinutesChange]
	);

	const handleHoursStep = React.useCallback(
		(delta: number) => {
			onOffsetMinutesChange(getDurationMinutes(hours + delta, minutes));
		},
		[hours, minutes, onOffsetMinutesChange]
	);

	const handleMinutesStep = React.useCallback(
		(delta: number) => {
			onOffsetMinutesChange(getDurationMinutes(hours, minutes + delta));
		},
		[hours, minutes, onOffsetMinutesChange]
	);

	// MARK: - UI

	return (
		<>
			<DurationNumberInput
				unit="hours"
				min={0}
				max={maxDurationHours}
				value={hours}
				onValueChange={handleHoursChange}
				onStep={handleHoursStep}
				ariaLabel="Custom duration hours"
			/>
			<DurationNumberInput
				unit="minutes"
				min={hours === 0 ? minDurationMinutes : 0}
				max={hours >= maxDurationHours ? 0 : 59}
				value={minutes}
				onValueChange={handleMinutesChange}
				onStep={handleMinutesStep}
				ariaLabel="Custom duration minutes"
			/>
		</>
	);
};

interface TCustomDurationInputsProps {
	offsetMinutes: number;
	onOffsetMinutesChange: (offsetMinutes: number) => void;
}

const DurationNumberInput: React.FC<TDurationNumberInputProps> = (props) => {
	const { unit, min, max, value, onValueChange, onStep, ariaLabel } = props;

	const handleChange = React.useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const nextValue = Number(event.target.value);
			if (!Number.isFinite(nextValue)) {
				return;
			}

			onValueChange(nextValue);
		},
		[onValueChange]
	);

	return (
		<InputGroup className="w-17">
			<InputGroupInput
				type="number"
				min={min}
				max={max}
				value={value}
				onChange={handleChange}
				aria-label={ariaLabel}
			/>
			<InputGroupAddon align="inline-end" className="pr-2 text-xs">
				{unit === 'hours' ? 'H' : 'M'}
			</InputGroupAddon>
			<InputGroupStepper
				onIncrement={() => onStep(1)}
				onDecrement={() => onStep(-1)}
				incrementDisabled={value >= max}
				decrementDisabled={value <= min}
				incrementLabel={`Increase ${unit}`}
				decrementLabel={`Decrease ${unit}`}
			/>
		</InputGroup>
	);
};

interface TDurationNumberInputProps {
	unit: TDurationInputUnit;
	min: number;
	max: number;
	value: number;
	onValueChange: (value: number) => void;
	onStep: (delta: number) => void;
	ariaLabel: string;
}

type TDurationInputUnit = 'hours' | 'minutes';

function getDurationMinutes(hours: number, minutes: number): number {
	return hours * 60 + minutes;
}

function clampOffsetMinutes(offsetMinutes: number): number {
	return clampNumber(Math.trunc(offsetMinutes), minDurationMinutes, maxDurationHours * 60);
}

const minDurationMinutes = 1;
const maxDurationHours = 24;
