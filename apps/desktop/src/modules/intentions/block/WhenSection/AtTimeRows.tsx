import React from 'react';
import { Select } from '@/components';
import { formatLocalDate } from '@/lib';
import { SettingsRow } from '@/modules/settings';
import { TimeOfDayRow } from './TimeOfDayRow';
import { type TConditionRowsProps } from './types';

export const AtTimeRows: React.FC<TConditionRowsProps> = (props) => {
	const { condition, cx } = props;
	const dateOptions = React.useMemo(() => {
		const options: { value: string; label: string }[] = [];
		for (let offset = 0; offset < 7; offset += 1) {
			const date = new Date();
			date.setDate(date.getDate() + offset);
			options.push({
				value: formatLocalDate(date),
				label: getDateLabel(date, offset)
			});
		}
		return options;
	}, []);

	// MARK: - Actions

	const handleDateChange = React.useCallback(
		(event: React.ChangeEvent<HTMLSelectElement>) => {
			cx.updateCondition(condition.phase, { date: event.target.value });
		},
		[condition.phase, cx]
	);

	// MARK: - UI

	return (
		<>
			<SettingsRow label="Day" variant="compact">
				<Select variant="ghost" value={condition.date} onChange={handleDateChange}>
					{dateOptions.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</Select>
			</SettingsRow>
			<TimeOfDayRow condition={condition} cx={cx} ariaLabel="Condition time" />
		</>
	);
};

function getDateLabel(date: Date, offset: number): string {
	if (offset === 0) {
		return 'Today';
	}
	if (offset === 1) {
		return 'Tomorrow';
	}

	return new Intl.DateTimeFormat('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric'
	}).format(date);
}
