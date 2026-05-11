import React from 'react';
import { Select } from '@/components';
import { specta } from '@/environment';
import { formatDateInput, getLocalDateEpochDays, parseDateInput } from '@/lib';
import { SettingsRow } from '@/modules/settings';
import { TimeOfDayRow } from './TimeOfDayRow';
import { type TConditionRowsProps } from './types';

export const AtTimeRows: React.FC<TConditionRowsProps> = (props) => {
	const { condition, cx } = props;
	const dateOptions = Array.from({ length: 7 }, (_, offset) => getDateOption(offset));

	// MARK: - Actions

	const handleDateChange = React.useCallback(
		(event: React.ChangeEvent<HTMLSelectElement>) => {
			const dateEpochDays = parseDateInput(event.target.value);
			if (dateEpochDays == null) {
				return;
			}

			cx.updateCondition(condition.phase, { dateEpochDays });
		},
		[condition.phase, cx]
	);

	// MARK: - UI

	return (
		<>
			<SettingsRow label="Day" variant="compact">
				<Select
					variant="ghost"
					value={formatDateInput(condition.dateEpochDays)}
					onChange={handleDateChange}
				>
					{dateOptions.map((option) => (
						<option key={option.value} value={formatDateInput(option.value)}>
							{option.label}
						</option>
					))}
				</Select>
			</SettingsRow>
			<TimeOfDayRow condition={condition} cx={cx} ariaLabel="Condition time" />
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
