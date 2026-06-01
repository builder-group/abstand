import React from 'react';
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupStepper,
	Select
} from '@/components';
import { clampNumber, minutesToMs } from '@/lib';
import { SettingsRow } from '@/modules/settings';
import { type TConditionRowsProps } from './types';

export const DurationRows: React.FC<TConditionRowsProps> = (props) => {
	const {
		conditionRow: {
			condition: { offsetMs, transition },
			errors: { offsetMs: offsetError }
		},
		formCx,
		isDisabled = false
	} = props;
	const [isCustomDurationSelected, setIsCustomDurationSelected] = React.useState(false);

	const selectedDurationValue = isCustomDurationSelected
		? customDurationValue
		: (durationOptions.find((o) => minutesToMs(o.minutes) === offsetMs)?.minutes.toString() ??
			customDurationValue);

	// MARK: - Actions

	const handleOffsetMinutesChange = React.useCallback(
		(offsetMinutes: number) => {
			formCx.updateCondition(transition, {
				offsetMs: minutesToMs(clampOffsetMinutes(offsetMinutes))
			});
		},
		[transition, formCx]
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
			description={offsetError}
			descriptionVariant={offsetError != null ? 'error' : 'default'}
			variant="compact"
			contentClassName="min-w-0 shrink flex-wrap justify-end"
		>
			<Select
				variant="ghost"
				value={selectedDurationValue}
				disabled={isDisabled}
				onChange={handleDurationChange}
				aria-invalid={offsetError != null}
			>
				{durationOptions.map((option) => (
					<option key={option.minutes} value={option.minutes}>
						{option.label}
					</option>
				))}
				<option value={customDurationValue}>Custom</option>
			</Select>
			{selectedDurationValue === customDurationValue && (
				<CustomDurationInputs
					offsetMs={offsetMs}
					onOffsetMinutesChange={handleOffsetMinutesChange}
					isInvalid={offsetError != null}
					isDisabled={isDisabled}
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
	const { offsetMs, onOffsetMinutesChange, isInvalid = false, isDisabled = false } = props;
	const offsetMinutes = Math.floor(offsetMs / 60_000);
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
				isInvalid={isInvalid}
				isDisabled={isDisabled}
			/>
			<DurationNumberInput
				unit="minutes"
				min={hours === 0 ? minDurationMinutes : 0}
				max={hours >= maxDurationHours ? 0 : 59}
				value={minutes}
				onValueChange={handleMinutesChange}
				onStep={handleMinutesStep}
				ariaLabel="Custom duration minutes"
				isInvalid={isInvalid}
				isDisabled={isDisabled}
			/>
		</>
	);
};

interface TCustomDurationInputsProps {
	offsetMs: number;
	onOffsetMinutesChange: (offsetMinutes: number) => void;
	isInvalid?: boolean;
	isDisabled?: boolean;
}

const DurationNumberInput: React.FC<TDurationNumberInputProps> = (props) => {
	const {
		unit,
		min,
		max,
		value,
		onValueChange,
		onStep,
		ariaLabel,
		isInvalid = false,
		isDisabled = false
	} = props;

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
				disabled={isDisabled}
				onChange={handleChange}
				aria-label={ariaLabel}
				aria-invalid={isInvalid}
			/>
			<InputGroupAddon align="inline-end" className="pr-2 text-xs">
				{unit === 'hours' ? 'H' : 'M'}
			</InputGroupAddon>
			<InputGroupStepper
				onIncrement={() => onStep(1)}
				onDecrement={() => onStep(-1)}
				incrementDisabled={isDisabled || value >= max}
				decrementDisabled={isDisabled || value <= min}
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
	isInvalid?: boolean;
	isDisabled?: boolean;
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
