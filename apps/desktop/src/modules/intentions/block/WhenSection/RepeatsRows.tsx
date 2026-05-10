import React from 'react';
import { Select, Toggle } from '@/components';
import { SettingsRow } from '@/modules/settings';
import { newBlockIntentionConfig } from '../NewBlockIntentionCx';
import { TimeOfDayRow } from './TimeOfDayRow';
import { type TConditionRowsProps } from './types';

export const RepeatsRows: React.FC<TConditionRowsProps> = (props) => {
	const { condition, cx } = props;

	const handleRepeatModeChange = React.useCallback(
		(event: React.ChangeEvent<HTMLSelectElement>) => {
			cx.updateCondition(condition.phase, {
				weekdays:
					event.target.value === 'selectedDays'
						? [...newBlockIntentionConfig.defaultSelectedWeekdays]
						: null
			});
		},
		[condition.phase, cx]
	);

	return (
		<>
			<TimeOfDayRow condition={condition} cx={cx} ariaLabel="Repeat time" />
			<SettingsRow label="Days" variant="compact">
				<Select
					variant="ghost"
					value={condition.weekdays == null ? 'everyDay' : 'selectedDays'}
					onChange={handleRepeatModeChange}
				>
					<option value="everyDay">Every day</option>
					<option value="selectedDays">Selected days</option>
				</Select>
			</SettingsRow>
			{condition.weekdays != null && <WeekdayToggleRow condition={condition} cx={cx} />}
		</>
	);
};

const WeekdayToggleRow: React.FC<TConditionRowsProps> = (props) => {
	const { condition, cx } = props;

	return (
		<SettingsRow label="On" variant="compact">
			<div className="flex items-center gap-1">
				{newBlockIntentionConfig.weekdayOptions.map((weekday) => (
					<Toggle
						key={weekday.value}
						size="icon-xs"
						variant="default"
						pressed={condition.weekdays?.includes(weekday.value) ?? false}
						onPressedChange={() => cx.toggleConditionWeekday(condition.phase, weekday.value)}
						aria-label={weekday.label}
					>
						<span className="text-xs">{weekday.shortLabel}</span>
					</Toggle>
				))}
			</div>
		</SettingsRow>
	);
};
