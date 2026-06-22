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
import { blockIntentionFormConfig } from '../../BlockIntentionFormCx';
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

	const selectedDurationOption = durationOptions.find((option) => option.valueMs === offsetMs);
	const selectedDurationValue =
		isCustomDurationSelected || selectedDurationOption == null
			? customDurationValue
			: selectedDurationOption.valueMs.toString();

	// MARK: - Actions

	const handleOffsetMsChange = React.useCallback(
		(offsetMs: number) => {
			formCx.updateCondition(transition, {
				offsetMs: clampOffsetMs(offsetMs)
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

			const offsetMs = Number(event.target.value);
			if (!Number.isFinite(offsetMs)) {
				return;
			}

			setIsCustomDurationSelected(false);
			handleOffsetMsChange(offsetMs);
		},
		[handleOffsetMsChange]
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
					<option key={option.valueMs} value={option.valueMs}>
						{option.label}
					</option>
				))}
				<option value={customDurationValue}>Custom</option>
			</Select>
			{selectedDurationValue === customDurationValue && (
				<CustomDurationInputs
					offsetMs={offsetMs}
					onOffsetMsChange={handleOffsetMsChange}
					isInvalid={offsetError != null}
					isDisabled={isDisabled}
				/>
			)}
		</SettingsRow>
	);
};

const durationOptions = [
	{ valueMs: durationMinutesToMs(20), label: '20 minutes' },
	{ valueMs: durationMinutesToMs(30), label: '30 minutes' },
	{ valueMs: durationMinutesToMs(45), label: '45 minutes' },
	{ valueMs: durationMinutesToMs(60), label: '1 hour' },
	{ valueMs: durationMinutesToMs(24 * 60), label: '1 day' },
	{ valueMs: durationMinutesToMs(7 * 24 * 60), label: '7 days' },
	{ valueMs: durationMinutesToMs(30 * 24 * 60), label: '30 days' }
] as const;
const customDurationValue = 'custom';

const CustomDurationInputs: React.FC<TCustomDurationInputsProps> = (props) => {
	const { offsetMs, onOffsetMsChange, isInvalid = false, isDisabled = false } = props;
	const offsetMinutes = Math.floor(offsetMs / 60_000);

	const durationConfig = blockIntentionFormConfig.conditionDuration;
	const minMinutes = durationConfig.minMs / 60_000;
	const maxMinutes = durationConfig.maxMs / 60_000;
	const stepMinutes = durationConfig.stepMs / 60_000;
	const maxDays = maxMinutes / minutesPerDay;

	const days = Math.floor(offsetMinutes / minutesPerDay);
	const hours = Math.floor((offsetMinutes % minutesPerDay) / 60);
	const minutes = offsetMinutes % 60;

	// MARK: - Actions

	const handleDaysChange = React.useCallback(
		(nextDays: number) => {
			onOffsetMsChange(getDurationMs(nextDays, hours, minutes));
		},
		[hours, minutes, onOffsetMsChange]
	);

	const handleDaysStep = React.useCallback(
		(deltaDays: number) => {
			onOffsetMsChange(getDurationMs(days + deltaDays, hours, minutes));
		},
		[days, hours, minutes, onOffsetMsChange]
	);

	const handleHoursChange = React.useCallback(
		(nextHours: number) => {
			onOffsetMsChange(getDurationMs(days, nextHours, minutes));
		},
		[days, minutes, onOffsetMsChange]
	);

	const handleMinutesChange = React.useCallback(
		(nextMinutes: number) => {
			onOffsetMsChange(getDurationMs(days, hours, nextMinutes));
		},
		[days, hours, onOffsetMsChange]
	);

	const handleHoursStep = React.useCallback(
		(deltaHours: number) => {
			onOffsetMsChange(getDurationMs(days, hours + deltaHours, minutes));
		},
		[days, hours, minutes, onOffsetMsChange]
	);

	const handleMinutesStep = React.useCallback(
		(deltaMinutes: number) => {
			onOffsetMsChange(getDurationMs(days, hours, minutes + deltaMinutes));
		},
		[days, hours, minutes, onOffsetMsChange]
	);

	// MARK: - UI

	return (
		<>
			<DurationNumberInput
				unit="days"
				min={0}
				max={maxDays}
				step={1}
				value={days}
				onValueChange={handleDaysChange}
				onStep={handleDaysStep}
				ariaLabel="Custom duration days"
				isInvalid={isInvalid}
				isDisabled={isDisabled}
			/>
			<DurationNumberInput
				unit="hours"
				min={0}
				max={days >= maxDays ? 0 : 23}
				step={1}
				value={hours}
				onValueChange={handleHoursChange}
				onStep={handleHoursStep}
				ariaLabel="Custom duration hours"
				isInvalid={isInvalid}
				isDisabled={isDisabled}
			/>
			<DurationNumberInput
				unit="minutes"
				min={days === 0 && hours === 0 ? minMinutes : 0}
				max={days >= maxDays ? 0 : 59}
				step={stepMinutes}
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

const minutesPerDay = 24 * 60;

interface TCustomDurationInputsProps {
	offsetMs: number;
	onOffsetMsChange: (offsetMs: number) => void;
	isInvalid?: boolean;
	isDisabled?: boolean;
}

const DurationNumberInput: React.FC<TDurationNumberInputProps> = (props) => {
	const {
		unit,
		min,
		max,
		step,
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

			onValueChange(clampNumber(nextValue, min, max));
		},
		[min, max, onValueChange]
	);

	return (
		<InputGroup className="w-17">
			<InputGroupInput
				type="number"
				min={min}
				max={max}
				step={step}
				value={value}
				disabled={isDisabled}
				onChange={handleChange}
				aria-label={ariaLabel}
				aria-invalid={isInvalid}
			/>
			<InputGroupAddon align="inline-end" className="pr-2 text-xs">
				{getDurationInputUnitLabel(unit)}
			</InputGroupAddon>
			<InputGroupStepper
				onIncrement={() => onStep(step)}
				onDecrement={() => onStep(-step)}
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
	step: number;
	value: number;
	onValueChange: (value: number) => void;
	onStep: (delta: number) => void;
	ariaLabel: string;
	isInvalid?: boolean;
	isDisabled?: boolean;
}

type TDurationInputUnit = 'days' | 'hours' | 'minutes';

function getDurationInputUnitLabel(unit: TDurationInputUnit): string {
	switch (unit) {
		case 'days':
			return 'D';
		case 'hours':
			return 'H';
		case 'minutes':
			return 'M';
	}
}

function getDurationMs(days: number, hours: number, minutes: number): number {
	return durationMinutesToMs(days * minutesPerDay + hours * 60 + minutes);
}

function durationMinutesToMs(minutes: number): number {
	return minutes * 60_000;
}

function clampOffsetMs(offsetMs: number): number {
	const durationConfig = blockIntentionFormConfig.conditionDuration;
	const steppedOffsetMs = Math.trunc(offsetMs / durationConfig.stepMs) * durationConfig.stepMs;
	return clampNumber(steppedOffsetMs, durationConfig.minMs, durationConfig.maxMs);
}
