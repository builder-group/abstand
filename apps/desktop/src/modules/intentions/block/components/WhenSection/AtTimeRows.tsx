import React from 'react';
import { Select } from '@/components';
import { specta } from '@/environment';
import {
	formatDateInput,
	getLocalDateEpochDays,
	getLocalDateTime,
	parseDateInput,
	timeOnlyFromMs
} from '@/lib';
import { SettingsRow } from '@/modules/settings';
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
	const dateOptions = getDateOptions(dateEpochDays);

	// MARK: - Actions

	const handleDateChange = React.useCallback(
		(event: React.ChangeEvent<HTMLSelectElement>) => {
			const dateEpochDays = parseDateInput(event.target.value);
			if (dateEpochDays == null) {
				return;
			}

			formCx.updateCondition(transition, { dateEpochDays });
		},
		[transition, formCx]
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
					value={formatDateInput(dateEpochDays)}
					disabled={isDisabled}
					onChange={handleDateChange}
					aria-invalid={dateError != null}
				>
					{dateOptions.map((option) => (
						<option key={option.value} value={formatDateInput(option.value)}>
							{option.label}
						</option>
					))}
				</Select>
			</SettingsRow>
			<TimeOfDayRow {...props} ariaLabel="Condition time" />
		</>
	);
};

function getDateOptions(selectedDateEpochDays: specta.DateOnly): TDateOption[] {
	const options = Array.from({ length: 7 }, (_, offset) => getDateOption(offset));
	if (options.some((option) => option.value === selectedDateEpochDays)) {
		return options;
	}

	// Note: If an edited date is outside the next seven days, keep it selectable
	return [
		{
			value: selectedDateEpochDays,
			label: dateOptionLabelFormatter.format(
				getLocalDateTime(selectedDateEpochDays, timeOnlyFromMs(0))
			)
		},
		...options
	];
}

function getDateOption(offset: number): TDateOption {
	const date = new Date();
	date.setDate(date.getDate() + offset);
	const value = getLocalDateEpochDays(date);

	if (offset === 0) {
		return {
			value,
			label: 'Today'
		};
	}
	if (offset === 1) {
		return {
			value,
			label: 'Tomorrow'
		};
	}

	return {
		value,
		label: dateOptionLabelFormatter.format(date)
	};
}

interface TDateOption {
	value: specta.DateOnly;
	label: string;
}

const dateOptionLabelFormatter = new Intl.DateTimeFormat('en-US', {
	weekday: 'short',
	month: 'short',
	day: 'numeric'
});
