import {
	bitwiseFlag,
	createForm,
	FormFieldReValidateMode,
	FormFieldValidateMode
} from 'feature-form';
import React from 'react';
import { Err, type TResult } from 'tuple-result';
import { zValidator } from 'validation-adapters/zod';
import * as z from 'zod';
import { specta } from '@/environment';
import {
	getCurrentDateEpochDays,
	getLocalDateEpochDays,
	getLocalTimeOfDayMs,
	isDateEpochDays,
	isTimeOfDayMs,
	isWeekdayMask,
	timeOnlyFromMs,
	weekdayMaskFromWeekdays,
	type TWeekday
} from '@/lib';
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
				defaultValue: [],
				validator: zValidator(
					z.array(z.custom<TCatalogItem>()).superRefine((targets, ctx) => {
						if (this.$form.fields.scope.get() !== 'wholeDevice' && targets.length === 0) {
							ctx.addIssue({
								code: 'custom',
								message: 'Choose at least one app or website'
							});
						}
					})
				)
			},
			enforcementMode: {
				defaultValue: 'balanced'
			},
			conditions: {
				defaultValue: [
					{
						phase: 'start',
						mode: 'now',
						dateEpochDays: getCurrentDateEpochDays(),
						timeOfDayMs: timeOnlyFromMs(9 * 60 * 60 * 1_000),
						offsetMinutes: 30,
						weekdaysMask: null
					},
					{
						phase: 'end',
						mode: 'manual',
						dateEpochDays: getCurrentDateEpochDays(),
						timeOfDayMs: timeOnlyFromMs(17 * 60 * 60 * 1_000),
						offsetMinutes: 30,
						weekdaysMask: null
					}
				],
				validator: zValidator(
					z
						.array(
							z.object({
								phase: z.enum(['start', 'end']),
								mode: z.enum(['now', 'atTime', 'afterOffset', 'repeats', 'manual']),
								dateEpochDays: z.custom<specta.DateOnly>(
									(value) => typeof value === 'number' && isDateEpochDays(value),
									'Enter a valid date'
								),
								timeOfDayMs: z.custom<specta.TimeOnly>(
									(value) => typeof value === 'number' && isTimeOfDayMs(value),
									'Enter a valid time'
								),
								offsetMinutes: z.coerce.number().int().min(1).max(1440),
								weekdaysMask: z
									.custom<specta.WeekdayMask>(
										(value) => typeof value === 'number' && isWeekdayMask(value),
										'Please choose at least one day'
									)
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
		},
		notifyOnStatusChange: false,
		validateMode: bitwiseFlag(FormFieldValidateMode.OnSubmit),
		reValidateMode: bitwiseFlag(FormFieldReValidateMode.OnBlur, FormFieldReValidateMode.OnChange)
	});

	constructor(intentionsCx: IntentionsCx) {
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
					case 'now': {
						const now = new Date();
						return {
							phase: condition.phase,
							rule: {
								type: 'dateTime',
								dateEpochDays: getLocalDateEpochDays(now),
								timeOfDayMs: getLocalTimeOfDayMs(now)
							}
						};
					}
					case 'afterOffset': {
						const date = new Date(Date.now() + condition.offsetMinutes * 60_000);
						return {
							phase: condition.phase,
							rule: {
								type: 'dateTime',
								dateEpochDays: getLocalDateEpochDays(date),
								timeOfDayMs: getLocalTimeOfDayMs(date)
							}
						};
					}
					case 'atTime':
						return {
							phase: condition.phase,
							rule: {
								type: 'dateTime',
								dateEpochDays: condition.dateEpochDays,
								timeOfDayMs: condition.timeOfDayMs
							}
						};
					case 'repeats':
						return {
							phase: condition.phase,
							rule: {
								type: 'schedule',
								timeOfDayMs: condition.timeOfDayMs,
								weekdaysMask: condition.weekdaysMask
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
			dateEpochDays: getCurrentDateEpochDays(),
			timeOfDayMs:
				phase === 'start'
					? timeOnlyFromMs(9 * 60 * 60 * 1_000)
					: timeOnlyFromMs(17 * 60 * 60 * 1_000),
			offsetMinutes: 30,
			weekdaysMask: null
		};
	}
}

export const newBlockIntentionConfig = {
	weekdayOptions: [
		{ value: 'mon', shortLabel: 'M', label: 'Monday' },
		{ value: 'tue', shortLabel: 'T', label: 'Tuesday' },
		{ value: 'wed', shortLabel: 'W', label: 'Wednesday' },
		{ value: 'thu', shortLabel: 'T', label: 'Thursday' },
		{ value: 'fri', shortLabel: 'F', label: 'Friday' },
		{ value: 'sat', shortLabel: 'S', label: 'Saturday' },
		{ value: 'sun', shortLabel: 'S', label: 'Sunday' }
	] satisfies TWeekdayOption[],
	defaultSelectedWeekdaysMask: weekdayMaskFromWeekdays(['mon', 'tue', 'wed', 'thu', 'fri'])
} as const;

interface TWeekdayOption {
	value: TWeekday;
	shortLabel: string;
	label: string;
}

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
	dateEpochDays: specta.DateOnly;
	timeOfDayMs: specta.TimeOnly;
	offsetMinutes: number;
	weekdaysMask: specta.WeekdayMask | null;
}

export type TNewIntentionConditionMode = 'now' | 'atTime' | 'afterOffset' | 'repeats' | 'manual';

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
