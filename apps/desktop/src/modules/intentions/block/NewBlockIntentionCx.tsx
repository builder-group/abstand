import { createForm } from 'feature-form';
import React from 'react';
import { Err, type TResult } from 'tuple-result';
import { zValidator } from 'validation-adapters/zod';
import * as z from 'zod';
import { specta } from '@/environment';
import { formatLocalDate, formatTimeOfDay, getCurrentLocalDate, getCurrentTimeOfDay } from '@/lib';
import { type TCatalogItem } from '@/modules/catalog';
import { IntentionsCx, useIntentionsCx } from '../IntentionsCx';

export class NewBlockIntentionCx {
	private readonly intentionsCx: IntentionsCx;

	public readonly $form = createForm<TNewBlockIntentionFormData>({
		fields: {
			name: {
				defaultValue: '',
				validator: zValidator(
					z
						.string()
						.trim()
						.min(1, 'Please enter a name')
						.max(80, 'Name must be 80 characters or less')
				)
			},
			scope: {
				defaultValue: 'blockTargets'
			},
			selectedTargets: {
				defaultValue: []
			},
			enforcementMode: {
				defaultValue: 'balanced'
			},
			conditions: {
				defaultValue: [
					{
						phase: 'start',
						mode: 'now',
						date: getCurrentLocalDate(),
						timeOfDay: '09:00',
						offsetMinutes: 30,
						weekdays: null
					},
					{
						phase: 'end',
						mode: 'manual',
						date: getCurrentLocalDate(),
						timeOfDay: '17:00',
						offsetMinutes: 30,
						weekdays: null
					}
				],
				validator: zValidator(
					z
						.array(
							z.object({
								phase: z.enum(['start', 'end']),
								mode: z.enum(['now', 'atTime', 'inTime', 'repeats', 'manual']),
								date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date'),
								timeOfDay: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Enter a valid time'),
								offsetMinutes: z.coerce.number().int().min(1).max(1440),
								weekdays: z
									.array(z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']))
									.min(1, 'Please choose at least one day')
									.nullable()
							})
						)
						.superRefine((conditions, ctx) => {
							if (!conditions.some((condition) => condition.phase === 'start')) {
								ctx.addIssue({ code: 'custom', message: 'Please add a start condition' });
							}
							if (!conditions.some((condition) => condition.phase === 'end')) {
								ctx.addIssue({ code: 'custom', message: 'Please add an end condition' });
							}
						})
				)
			}
		}
	});

	public constructor(intentionsCx: IntentionsCx) {
		this.intentionsCx = intentionsCx;
	}

	public getCondition(
		phase: specta.IntentionConditionPhase
	): TNewIntentionConditionFormData | null {
		return (
			this.$form.fields.conditions.get()?.find((condition) => condition.phase === phase) ?? null
		);
	}

	public upsertCondition(nextCondition: TNewIntentionConditionFormData): void {
		const conditions = this.$form.fields.conditions.get() ?? [];
		const nextConditions = conditions.filter(
			(condition) => condition.phase !== nextCondition.phase
		);
		if (nextCondition.phase === 'start') {
			this.$form.fields.conditions.set([nextCondition, ...nextConditions]);
			return;
		}

		this.$form.fields.conditions.set([...nextConditions, nextCondition]);
	}

	public updateCondition(
		phase: specta.IntentionConditionPhase,
		update: Partial<Omit<TNewIntentionConditionFormData, 'phase'>>
	): void {
		this.upsertCondition({
			...(this.getCondition(phase) ?? this.createDefaultCondition(phase)),
			...update
		});
	}

	public setConditionMode(
		phase: specta.IntentionConditionPhase,
		mode: TNewIntentionConditionMode
	): void {
		this.updateCondition(phase, { mode });
	}

	public toggleConditionWeekday(
		phase: specta.IntentionConditionPhase,
		weekday: specta.Weekday
	): void {
		const condition = this.getCondition(phase) ?? this.createDefaultCondition(phase);
		const weekdays = condition.weekdays ?? DEFAULT_SELECTED_WEEKDAYS;
		const hasWeekday = weekdays.includes(weekday);
		if (hasWeekday && weekdays.length === 1) {
			return;
		}

		this.updateCondition(phase, {
			weekdays: hasWeekday
				? weekdays.filter((currentWeekday) => currentWeekday !== weekday)
				: [...weekdays, weekday].sort((a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b))
		});
	}

	public async submit(): Promise<TResult<specta.Intention, string>> {
		const formData = this.$form.getValidData();
		if (formData == null) {
			return Err('Form is invalid');
		}

		const targets = formData.selectedTargets.map(
			(item): specta.CreateIntentionBlockTargetParams => {
				switch (item.type) {
					case 'app':
						return {
							type: 'app',
							stableId: item.app.stableId,
							name: item.app.name,
							bundleId: item.app.bundleId,
							processPath: item.app.processPath,
							icon: item.app.icon,
							color: item.app.color
						};
					case 'website':
						return {
							type: 'website',
							hostname: item.website.hostname,
							name: item.website.name,
							icon: item.website.icon,
							color: item.website.color
						};
				}
			}
		);

		return this.intentionsCx.create({
			name: formData.name.trim(),
			behavior: {
				type: 'block',
				scope: formData.scope,
				enforcementMode: formData.enforcementMode,
				targets
			},
			conditions: formData.conditions.map((condition) => {
				switch (condition.mode) {
					case 'manual':
						return {
							phase: condition.phase,
							rule: { type: 'manual' }
						};
					case 'now':
						return {
							phase: condition.phase,
							rule: {
								type: 'dateTime',
								date: getCurrentLocalDate(),
								timeOfDay: getCurrentTimeOfDay()
							}
						};
					case 'inTime': {
						const date = new Date();
						date.setMinutes(date.getMinutes() + condition.offsetMinutes);
						return {
							phase: condition.phase,
							rule: {
								type: 'dateTime',
								date: formatLocalDate(date),
								timeOfDay: formatTimeOfDay(date)
							}
						};
					}
					case 'atTime':
						return {
							phase: condition.phase,
							rule: {
								type: 'dateTime',
								date: condition.date,
								timeOfDay: condition.timeOfDay
							}
						};
					case 'repeats':
						return {
							phase: condition.phase,
							rule: {
								type: 'schedule',
								timeOfDay: condition.timeOfDay,
								weekdays: condition.weekdays
							}
						};
				}
			})
		});
	}

	private createDefaultCondition(
		phase: specta.IntentionConditionPhase
	): TNewIntentionConditionFormData {
		return {
			phase,
			mode: phase === 'start' ? 'now' : 'manual',
			date: getCurrentLocalDate(),
			timeOfDay: phase === 'start' ? '09:00' : '17:00',
			offsetMinutes: 30,
			weekdays: null
		};
	}
}

export const WEEKDAY_OPTIONS = [
	{ value: 'mon', shortLabel: 'M', label: 'Monday' },
	{ value: 'tue', shortLabel: 'T', label: 'Tuesday' },
	{ value: 'wed', shortLabel: 'W', label: 'Wednesday' },
	{ value: 'thu', shortLabel: 'T', label: 'Thursday' },
	{ value: 'fri', shortLabel: 'F', label: 'Friday' },
	{ value: 'sat', shortLabel: 'S', label: 'Saturday' },
	{ value: 'sun', shortLabel: 'S', label: 'Sunday' }
] satisfies TWeekdayOption[];

export const DEFAULT_SELECTED_WEEKDAYS = [
	'mon',
	'tue',
	'wed',
	'thu',
	'fri'
] satisfies specta.Weekday[];

const WEEKDAY_ORDER = WEEKDAY_OPTIONS.map((weekday) => weekday.value);

export interface TNewBlockIntentionFormData {
	name: string;
	scope: specta.IntentionBlockScope;
	selectedTargets: TCatalogItem[];
	enforcementMode: specta.IntentionEnforcementMode;
	conditions: TNewIntentionConditionFormData[];
}

export interface TNewIntentionConditionFormData {
	phase: specta.IntentionConditionPhase;
	mode: TNewIntentionConditionMode;
	date: string;
	timeOfDay: string;
	offsetMinutes: number;
	weekdays: specta.Weekday[] | null;
}

export type TNewIntentionConditionMode = 'now' | 'atTime' | 'inTime' | 'repeats' | 'manual';

interface TWeekdayOption {
	value: specta.Weekday;
	shortLabel: string;
	label: string;
}

const ReactNewBlockIntentionCx = React.createContext<NewBlockIntentionCx | null>(null);

export const NewBlockIntentionCxProvider: React.FC<{ children: React.ReactNode }> = ({
	children
}) => {
	const intentionsCx = useIntentionsCx();
	const cx = React.useMemo(() => new NewBlockIntentionCx(intentionsCx), [intentionsCx]);

	return (
		<ReactNewBlockIntentionCx.Provider value={cx}>{children}</ReactNewBlockIntentionCx.Provider>
	);
};

export function useNewBlockIntentionCx(): NewBlockIntentionCx {
	const cx = React.useContext(ReactNewBlockIntentionCx);
	if (cx == null) {
		throw new Error('useNewBlockIntentionCx must be used within a NewBlockIntentionCxProvider');
	}
	return cx;
}
