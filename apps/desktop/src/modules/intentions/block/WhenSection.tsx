import { useFeatureState } from 'feature-react/state';
import React from 'react';
import {
	Input,
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupStepper,
	Select,
	Toggle
} from '@/components';
import { type specta } from '@/environment';
import { clampNumber, formatLocalDate } from '@/lib';
import { SettingsGroup, SettingsRow } from '@/modules/settings';
import {
	DEFAULT_SELECTED_WEEKDAYS,
	useNewBlockIntentionCx,
	WEEKDAY_OPTIONS,
	type TNewIntentionConditionFormData,
	type TNewIntentionConditionMode
} from './NewBlockIntentionCx';

export const WhenSection: React.FC = () => {
	const cx = useNewBlockIntentionCx();
	useFeatureState(cx.$form.fields.conditions);

	return (
		<div className="space-y-2.5">
			<SettingsGroup title="When">
				<ConditionRowSet
					phase="start"
					label="Starts"
					description="Choose when this Abstand begins."
					condition={cx.getCondition('start')}
					cx={cx}
				/>
			</SettingsGroup>

			<SettingsGroup>
				<ConditionRowSet
					phase="end"
					label="Ends"
					description="Choose when this Abstand releases."
					condition={cx.getCondition('end')}
					cx={cx}
				/>
			</SettingsGroup>
		</div>
	);
};

const ConditionRowSet: React.FC<TConditionRowSetProps> = (props) => {
	const { phase, label, description, condition, cx } = props;
	const modeOptions = React.useMemo(() => {
		switch (phase) {
			case 'start':
				return [
					{ value: 'now', label: 'Now' },
					{ value: 'atTime', label: 'At time' },
					{ value: 'inTime', label: 'In time' },
					{ value: 'repeats', label: 'Repeats' },
					{ value: 'manual', label: 'Manual' }
				];
			case 'end':
				return [
					{ value: 'inTime', label: 'In time' },
					{ value: 'atTime', label: 'At time' },
					{ value: 'repeats', label: 'Repeats' },
					{ value: 'manual', label: 'Manual' }
				];
		}
	}, [phase]);

	// MARK: - Actions

	const handleModeChange = React.useCallback(
		(event: React.ChangeEvent<HTMLSelectElement>) => {
			cx.setConditionMode(phase, event.target.value as TNewIntentionConditionMode);
		},
		[cx, phase]
	);

	// MARK: - UI

	if (condition == null) {
		return null;
	}

	return (
		<>
			<SettingsRow label={label} description={description}>
				<Select variant="ghost" value={condition.mode} onChange={handleModeChange}>
					{modeOptions.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</Select>
			</SettingsRow>

			{condition.mode === 'atTime' && <AtTimeRowSet condition={condition} cx={cx} />}
			{condition.mode === 'inTime' && <InTimeRowSet condition={condition} cx={cx} />}
			{condition.mode === 'repeats' && <RepeatsRowSet condition={condition} cx={cx} />}
		</>
	);
};

interface TConditionRowSetProps {
	phase: specta.IntentionConditionPhase;
	label: string;
	description: string;
	condition: TNewIntentionConditionFormData | null;
	cx: ReturnType<typeof useNewBlockIntentionCx>;
}

const AtTimeRowSet: React.FC<TConditionDetailRowSetProps> = (props) => {
	const { condition, cx } = props;
	const dateOptions = React.useMemo(() => {
		const options: Array<{ value: string; label: string }> = [];
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

	const handleTimeChange = React.useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			cx.updateCondition(condition.phase, { timeOfDay: event.target.value });
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
			<SettingsRow label="Time" variant="compact">
				<Input
					type="time"
					value={condition.timeOfDay}
					onChange={handleTimeChange}
					className="w-24"
					aria-label="Condition time"
				/>
			</SettingsRow>
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

const InTimeRowSet: React.FC<TConditionDetailRowSetProps> = (props) => {
	const { condition, cx } = props;
	const [isCustomDurationSelected, setIsCustomDurationSelected] = React.useState(false);

	const selectedDurationValue = getInTimeDurationValue(
		condition.offsetMinutes,
		isCustomDurationSelected
	);
	const customHours = Math.floor(condition.offsetMinutes / 60);
	const customMinutes = condition.offsetMinutes % 60;

	// MARK: - Actions

	const handleDurationChange = React.useCallback(
		(event: React.ChangeEvent<HTMLSelectElement>) => {
			if (event.target.value === 'custom') {
				setIsCustomDurationSelected(true);
				return;
			}

			const offsetMinutes = Number(event.target.value);
			if (!Number.isFinite(offsetMinutes)) {
				return;
			}

			setIsCustomDurationSelected(false);
			cx.updateCondition(condition.phase, { offsetMinutes });
		},
		[condition.phase, cx]
	);

	const handleCustomHoursChange = React.useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const hours = Number(event.target.value);
			if (!Number.isFinite(hours)) {
				return;
			}

			cx.updateCondition(condition.phase, {
				offsetMinutes: clampInTimeDuration(hours * 60 + customMinutes)
			});
		},
		[condition.phase, customMinutes, cx]
	);

	const handleCustomMinutesChange = React.useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const minutes = Number(event.target.value);
			if (!Number.isFinite(minutes)) {
				return;
			}

			cx.updateCondition(condition.phase, {
				offsetMinutes: clampInTimeDuration(customHours * 60 + minutes)
			});
		},
		[condition.phase, customHours, cx]
	);

	const handleStepCustomHours = React.useCallback(
		(delta: number) => {
			cx.updateCondition(condition.phase, {
				offsetMinutes: clampInTimeDuration((customHours + delta) * 60 + customMinutes)
			});
		},
		[condition.phase, customHours, customMinutes, cx]
	);

	const handleStepCustomMinutes = React.useCallback(
		(delta: number) => {
			cx.updateCondition(condition.phase, {
				offsetMinutes: clampInTimeDuration(customHours * 60 + customMinutes + delta)
			});
		},
		[condition.phase, customHours, customMinutes, cx]
	);

	// MARK: - UI

	return (
		<SettingsRow label="After" variant="compact">
			<div className="flex flex-wrap items-center justify-end gap-1.5">
				<Select variant="ghost" value={selectedDurationValue} onChange={handleDurationChange}>
					{IN_TIME_DURATION_OPTIONS.map((option) => (
						<option key={option.minutes} value={option.minutes}>
							{option.label}
						</option>
					))}
					<option value="custom">Custom</option>
				</Select>
				{selectedDurationValue === 'custom' && (
					<>
						<DurationNumberInput
							unit="H"
							min={0}
							max={24}
							value={customHours}
							onChange={handleCustomHoursChange}
							onIncrement={() => handleStepCustomHours(1)}
							onDecrement={() => handleStepCustomHours(-1)}
							aria-label="Custom duration hours"
						/>
						<DurationNumberInput
							unit="M"
							min={customHours === 0 ? 1 : 0}
							max={customHours >= 24 ? 0 : 59}
							value={customMinutes}
							onChange={handleCustomMinutesChange}
							onIncrement={() => handleStepCustomMinutes(1)}
							onDecrement={() => handleStepCustomMinutes(-1)}
							aria-label="Custom duration minutes"
						/>
					</>
				)}
			</div>
		</SettingsRow>
	);
};

const DurationNumberInput: React.FC<TDurationNumberInputProps> = (props) => {
	const { unit, min, max, value, onIncrement, onDecrement, ...rest } = props;
	const numberValue = typeof value === 'number' ? value : Number(value);
	const isDecrementDisabled =
		Number.isFinite(numberValue) && min != null && numberValue <= Number(min);
	const isIncrementDisabled =
		Number.isFinite(numberValue) && max != null && numberValue >= Number(max);

	return (
		<InputGroup className="w-17">
			<InputGroupInput type="number" min={min} max={max} value={value} {...rest} />
			<InputGroupAddon align="inline-end" className="pr-2 text-xs">
				{unit}
			</InputGroupAddon>
			<InputGroupStepper
				onIncrement={onIncrement}
				onDecrement={onDecrement}
				incrementDisabled={isIncrementDisabled}
				decrementDisabled={isDecrementDisabled}
				incrementLabel={`Increase ${unit === 'H' ? 'hours' : 'minutes'}`}
				decrementLabel={`Decrease ${unit === 'H' ? 'hours' : 'minutes'}`}
			/>
		</InputGroup>
	);
};

interface TDurationNumberInputProps extends Omit<
	React.ComponentProps<typeof InputGroupInput>,
	'type'
> {
	unit: 'H' | 'M';
	onIncrement: () => void;
	onDecrement: () => void;
}

const IN_TIME_DURATION_OPTIONS = [
	{ minutes: 20, label: '20 minutes' },
	{ minutes: 30, label: '30 minutes' },
	{ minutes: 45, label: '45 minutes' },
	{ minutes: 60, label: '1 hour' }
] satisfies TInTimeDurationOption[];

interface TInTimeDurationOption {
	minutes: number;
	label: string;
}

function getInTimeDurationValue(offsetMinutes: number, isCustomDurationSelected: boolean): string {
	if (isCustomDurationSelected) {
		return 'custom';
	}

	const matchingOption = IN_TIME_DURATION_OPTIONS.find(
		(option) => option.minutes === offsetMinutes
	);
	return matchingOption == null ? 'custom' : String(matchingOption.minutes);
}

function clampInTimeDuration(offsetMinutes: number): number {
	return clampNumber(Math.trunc(offsetMinutes), 1, 1440);
}

const RepeatsRowSet: React.FC<TConditionDetailRowSetProps> = (props) => {
	const { condition, cx } = props;

	// MARK: - Actions

	const handleTimeChange = React.useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			cx.updateCondition(condition.phase, { timeOfDay: event.target.value });
		},
		[condition.phase, cx]
	);

	const handleRepeatModeChange = React.useCallback(
		(event: React.ChangeEvent<HTMLSelectElement>) => {
			cx.updateCondition(condition.phase, {
				weekdays: event.target.value === 'selectedDays' ? DEFAULT_SELECTED_WEEKDAYS : null
			});
		},
		[condition.phase, cx]
	);

	// MARK: - UI

	return (
		<>
			<SettingsRow label="Time" variant="compact">
				<Input
					type="time"
					value={condition.timeOfDay}
					onChange={handleTimeChange}
					className="w-24"
					aria-label="Repeat time"
				/>
			</SettingsRow>
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

interface TConditionDetailRowSetProps {
	condition: TNewIntentionConditionFormData;
	cx: ReturnType<typeof useNewBlockIntentionCx>;
}

const WeekdayToggleRow: React.FC<TConditionDetailRowSetProps> = (props) => {
	const { condition, cx } = props;

	return (
		<SettingsRow label="On" variant="compact">
			<div className="flex items-center gap-1">
				{WEEKDAY_OPTIONS.map((weekday) => (
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
