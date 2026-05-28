import React from 'react';
import { Select, ToggleGroup, ToggleGroupItem, Tooltip } from '@/components';
import { isWeekday, weekdayMaskFromWeekdays, weekdaysFromWeekdayMask } from '@/lib';
import { SettingsRow } from '@/modules/settings';
import { newBlockIntentionConfig } from '../NewBlockIntentionCx';
import { TimeOfDayRow } from './TimeOfDayRow';
import { type TConditionRowsProps } from './types';

export const RepeatsRows: React.FC<TConditionRowsProps> = (props) => {
	const {
		conditionRow: {
			condition: { transition, weekdaysMask },
			errors: { weekdaysMask: weekdaysError }
		},
		cx
	} = props;

	const handleRepeatModeChange = React.useCallback(
		(event: React.ChangeEvent<HTMLSelectElement>) => {
			cx.updateCondition(transition, {
				weekdaysMask:
					event.target.value === 'selectedDays'
						? newBlockIntentionConfig.defaultSelectedWeekdaysMask
						: null
			});
		},
		[transition, cx]
	);

	return (
		<>
			<TimeOfDayRow {...props} ariaLabel="Repeat time" />
			<SettingsRow
				label="Days"
				description={weekdaysError}
				descriptionVariant={weekdaysError != null ? 'error' : 'default'}
				variant="compact"
				contentClassName="min-w-0 shrink flex-wrap justify-end"
			>
				<Select
					variant="ghost"
					value={weekdaysMask == null ? 'everyDay' : 'selectedDays'}
					onChange={handleRepeatModeChange}
					aria-invalid={weekdaysError != null}
				>
					<option value="everyDay">Every day</option>
					<option value="selectedDays">Selected days</option>
				</Select>
				{weekdaysMask != null && <WeekdayToggleGroup {...props} />}
			</SettingsRow>
		</>
	);
};

const WeekdayToggleGroup: React.FC<TConditionRowsProps> = (props) => {
	const {
		conditionRow: {
			condition: { transition, weekdaysMask }
		},
		cx
	} = props;
	const selectedWeekdays = React.useMemo(() => {
		if (weekdaysMask == null) {
			return [];
		}

		return weekdaysFromWeekdayMask(weekdaysMask);
	}, [weekdaysMask]);

	const handleWeekdaysChange = React.useCallback(
		(values: string[]) => {
			const weekdays = values.filter(isWeekday);
			if (weekdays.length === 0) {
				return;
			}

			cx.updateCondition(transition, {
				weekdaysMask: weekdayMaskFromWeekdays(weekdays)
			});
		},
		[transition, cx]
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
