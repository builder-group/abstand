import React from 'react';
import { Select, ToggleGroup, ToggleGroupItem, Tooltip } from '@/components';
import { isWeekday, weekdayMaskFromWeekdays, weekdaysFromWeekdayMask } from '@/lib';
import { SettingsRow } from '@/modules/settings';
import { newBlockIntentionConfig } from '../NewBlockIntentionCx';
import { TimeOfDayRow } from './TimeOfDayRow';
import { type TConditionRowsProps } from './types';

export const RepeatsRows: React.FC<TConditionRowsProps> = (props) => {
	const { condition, cx } = props;

	const handleRepeatModeChange = React.useCallback(
		(event: React.ChangeEvent<HTMLSelectElement>) => {
			cx.updateCondition(condition.transition, {
				weekdaysMask:
					event.target.value === 'selectedDays'
						? newBlockIntentionConfig.defaultSelectedWeekdaysMask
						: null
			});
		},
		[condition.transition, cx]
	);

	return (
		<>
			<TimeOfDayRow condition={condition} cx={cx} ariaLabel="Repeat time" />
			<SettingsRow
				label="Days"
				variant="compact"
				contentClassName="min-w-0 shrink flex-wrap justify-end"
			>
				<Select
					variant="ghost"
					value={condition.weekdaysMask == null ? 'everyDay' : 'selectedDays'}
					onChange={handleRepeatModeChange}
				>
					<option value="everyDay">Every day</option>
					<option value="selectedDays">Selected days</option>
				</Select>
				{condition.weekdaysMask != null && <WeekdayToggleGroup condition={condition} cx={cx} />}
			</SettingsRow>
		</>
	);
};

const WeekdayToggleGroup: React.FC<TConditionRowsProps> = (props) => {
	const { condition, cx } = props;
	const selectedWeekdays = React.useMemo(() => {
		if (condition.weekdaysMask == null) {
			return [];
		}

		return weekdaysFromWeekdayMask(condition.weekdaysMask);
	}, [condition.weekdaysMask]);

	const handleWeekdaysChange = React.useCallback(
		(values: string[]) => {
			const weekdays = values.filter(isWeekday);
			if (weekdays.length === 0) {
				return;
			}

			cx.updateCondition(condition.transition, {
				weekdaysMask: weekdayMaskFromWeekdays(weekdays)
			});
		},
		[condition.transition, cx]
	);

	return (
		<ToggleGroup
			multiple
			variant="outline"
			value={selectedWeekdays}
			onValueChange={handleWeekdaysChange}
		>
			{newBlockIntentionConfig.weekdayOptions.map((weekday) => (
				<Tooltip key={weekday.value} content={weekday.label}>
					<ToggleGroupItem value={weekday.value} aria-label={weekday.label}>
						<span className="text-sm">{weekday.shortLabel}</span>
					</ToggleGroupItem>
				</Tooltip>
			))}
		</ToggleGroup>
	);
};
