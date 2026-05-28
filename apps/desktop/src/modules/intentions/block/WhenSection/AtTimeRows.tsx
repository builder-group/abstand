import React from 'react';
import { Select } from '@/components';
import { specta } from '@/environment';
import { formatDateInput, getLocalDateEpochDays, parseDateInput } from '@/lib';
import { SettingsRow } from '@/modules/settings';
import { TimeOfDayRow } from './TimeOfDayRow';
import { type TConditionRowsProps } from './types';

export const AtTimeRows: React.FC<TConditionRowsProps> = (props) => {
	const {
		conditionRow: {
			condition: { dateEpochDays, transition },
			errors: { dateEpochDays: dateError }
		},
		cx
	} = props;
	const dateOptions = Array.from({ length: 7 }, (_, offset) => getDateOption(offset));

	// MARK: - Actions

	const handleDateChange = React.useCallback(
		(event: React.ChangeEvent<HTMLSelectElement>) => {
			const dateEpochDays = parseDateInput(event.target.value);
			if (dateEpochDays == null) {
				return;
			}

			cx.updateCondition(transition, { dateEpochDays });
		},
		[transition, cx]
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
