import React from 'react';
import { Input, Select } from '@/components';
import { specta } from '@/environment';
import { formatDateInput, getLocalDateEpochDays, parseDateInput } from '@/lib';
import { SettingsRow } from '@/modules/settings';
import { blockIntentionFormConfig } from '../../BlockIntentionFormCx';
import { TimeOfDayRow } from './TimeOfDayRow';
import { type TConditionRowsProps } from './types';

export const AtTimeRows: React.FC<TConditionRowsProps> = (props) => {
	const {
		conditionRow: {
			condition: { dateEpochDays, transition },
			errors: { dateEpochDays: dateError }
		},
		formCx,
		isDisabled = false
	} = props;
	const [isCustomDateSelected, setIsCustomDateSelected] = React.useState(false);

	const dateOptions = getDateOptions();
	const selectedDateOption = dateOptions.find((option) => option.valueEpochDays === dateEpochDays);
	const selectedDateValue =
		isCustomDateSelected || selectedDateOption == null
			? customDateValue
			: formatDateInput(selectedDateOption.valueEpochDays);

	// MARK: - Actions

	const handleDateEpochDaysChange = React.useCallback(
		(dateEpochDays: specta.DateOnly) => {
			formCx.updateCondition(transition, { dateEpochDays });
		},
		[transition, formCx]
	);

	const handleDateChange = React.useCallback(
		(event: React.ChangeEvent<HTMLSelectElement>) => {
			if (event.target.value === customDateValue) {
				setIsCustomDateSelected(true);
				return;
			}

			const dateEpochDays = parseDateInput(event.target.value);
			if (dateEpochDays == null) {
				return;
			}

			setIsCustomDateSelected(false);
			handleDateEpochDaysChange(dateEpochDays);
		},
		[handleDateEpochDaysChange]
	);

	// MARK: - UI

	return (
		<>
			<SettingsRow
				label="Day"
				description={dateError}
				descriptionVariant={dateError != null ? 'error' : 'default'}
				variant="compact"
			>
				<Select
					variant="ghost"
					value={selectedDateValue}
					disabled={isDisabled}
					onChange={handleDateChange}
					aria-invalid={dateError != null}
				>
					{dateOptions.map((option) => (
						<option
							key={option.valueEpochDays}
							value={formatDateInput(option.valueEpochDays)}
						>
							{option.label}
						</option>
					))}
					<option value={customDateValue}>Custom</option>
				</Select>
				{selectedDateValue === customDateValue && (
					<CustomDateInput
						dateEpochDays={dateEpochDays}
						onDateEpochDaysChange={handleDateEpochDaysChange}
						isInvalid={dateError != null}
						isDisabled={isDisabled}
					/>
				)}
			</SettingsRow>
			<TimeOfDayRow {...props} ariaLabel="Condition time" />
		</>
	);
};

const customDateValue = 'custom';

function getDateOptions(): TDateOption[] {
	return Array.from({ length: 7 }, (_, offset) => getDateOption(offset));
}

function getDateOption(offset: number): TDateOption {
	const date = new Date();
	date.setDate(date.getDate() + offset);
	const valueEpochDays = getLocalDateEpochDays(date);

	if (offset === 0) {
		return {
			valueEpochDays,
			label: 'Today'
		};
	}
	if (offset === 1) {
		return {
			valueEpochDays,
			label: 'Tomorrow'
		};
	}

	return {
		valueEpochDays,
		label: dateOptionLabelFormatter.format(date)
	};
}

interface TDateOption {
	valueEpochDays: specta.DateOnly;
	label: string;
}

const dateOptionLabelFormatter = new Intl.DateTimeFormat('en-US', {
	weekday: 'short',
	month: 'short',
	day: 'numeric'
});

const CustomDateInput: React.FC<TCustomDateInputProps> = (props) => {
	const {
		dateEpochDays,
		onDateEpochDaysChange,
		isInvalid = false,
		isDisabled = false
	} = props;

	const handleChange = React.useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const dateEpochDays = parseDateInput(event.target.value);
			if (dateEpochDays == null) {
				return;
			}

			onDateEpochDaysChange(dateEpochDays);
		},
		[onDateEpochDaysChange]
	);

	return (
		<Input
			type="date"
			size="sm"
			value={formatDateInput(dateEpochDays)}
			min={formatDateInput(getDateOption(0).valueEpochDays)}
			max={formatDateInput(getMaxDateEpochDays())}
			disabled={isDisabled}
			onChange={handleChange}
			aria-label="Custom condition date"
			aria-invalid={isInvalid}
		/>
	);
};

interface TCustomDateInputProps {
	dateEpochDays: specta.DateOnly;
	onDateEpochDaysChange: (dateEpochDays: specta.DateOnly) => void;
	isInvalid?: boolean;
	isDisabled?: boolean;
}

function getMaxDateEpochDays(): specta.DateOnly {
	const maxDate = new Date(Date.now() + blockIntentionFormConfig.conditionDuration.maxMs);
	return getLocalDateEpochDays(maxDate);
}
