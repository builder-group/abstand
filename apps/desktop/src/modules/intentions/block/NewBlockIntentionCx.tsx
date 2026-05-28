import { createForm, type TFormValidator } from 'feature-form';
import React from 'react';
import { Err, Ok, type TResult } from 'tuple-result';
import * as z from 'zod';
import { specta } from '@/environment';
import {
	getCurrentDateEpochDays,
	getLocalDateEpochDays,
	getLocalDateTime,
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
				validator: z
					.string()
					.trim()
					.min(1, 'Please enter a name')
					.max(80, 'Name must be 80 characters or less')
			},
			scope: {
				defaultValue: 'blockTargets',
				validator: z.enum(['blockTargets', 'allowTargets', 'wholeDevice'])
			},
			selectedTargets: {
				defaultValue: [],
				validator: z.array(z.custom<TCatalogItem>())
			},
			enforcementMode: {
				defaultValue: 'balanced',
				validator: z.enum(['casual', 'balanced', 'strict'])
			},
			conditions: {
				defaultValue: [
					createDefaultNewIntentionCondition('start'),
					createDefaultNewIntentionCondition('end')
				],
				validator: z
					.array(
						z.object({
							transition: z.enum(['start', 'end']),
							mode: z.enum(['now', 'atTime', 'afterDelay', 'afterDuration', 'repeats', 'manual']),
							dateEpochDays: z.custom<specta.DateOnly>(
								(value) => typeof value === 'number' && isDateEpochDays(value),
								'Enter a valid date'
							),
							timeOfDayMs: z.custom<specta.TimeOnly>(
								(value) => typeof value === 'number' && isTimeOfDayMs(value),
								'Enter a valid time'
							),
							offsetMs: z.number().int().min(60_000).max(86_400_000),
							weekdaysMask: z
								.custom<specta.WeekdayMask>(
									(value) => typeof value === 'number' && isWeekdayMask(value),
									'Please choose at least one day'
								)
								.nullable()
						})
					)
					.superRefine((conditions, ctx) => {
						const now = Date.now();
						const startConditionIndex = conditions.findIndex(
							(condition) => condition.transition === 'start'
						);
						const endConditionIndex = conditions.findIndex(
							(condition) => condition.transition === 'end'
						);
						const startCondition = conditions[startConditionIndex] ?? null;
						const endCondition = conditions[endConditionIndex] ?? null;

						if (startCondition == null) {
							ctx.addIssue({ code: 'custom', message: 'Please add a start condition' });
						}
						if (endCondition == null) {
							ctx.addIssue({ code: 'custom', message: 'Please add an end condition' });
						}
						if (startCondition == null || endCondition == null) {
							return;
						}

						const startAt =
							startCondition.mode === 'atTime'
								? getLocalDateTime(
										startCondition.dateEpochDays,
										startCondition.timeOfDayMs
									).getTime()
								: null;
						const isRepeatingScheduleEnd =
							startCondition.mode === 'repeats' && endCondition.mode === 'atTime';
						const endAt =
							endCondition.mode === 'atTime' && !isRepeatingScheduleEnd
								? getLocalDateTime(endCondition.dateEpochDays, endCondition.timeOfDayMs).getTime()
								: null;

						if (startAt != null && startAt <= now) {
							ctx.addIssue({
								code: 'custom',
								path: [startConditionIndex, 'timeOfDayMs'],
								message: 'Choose a future time'
							});
						}
						if (startCondition.mode === 'afterDelay' && startCondition.offsetMs % 60_000 !== 0) {
							ctx.addIssue({
								code: 'custom',
								path: [startConditionIndex, 'offsetMs'],
								message: 'Duration must use whole minutes'
							});
						}

						if (endCondition.mode === 'afterDuration' && endCondition.offsetMs % 60_000 !== 0) {
							ctx.addIssue({
								code: 'custom',
								path: [endConditionIndex, 'offsetMs'],
								message: 'Duration must use whole minutes'
							});
						}

						if (endCondition.mode !== 'atTime') {
							return;
						}

						if (isRepeatingScheduleEnd) {
							// Note: Schedule ends inherit the start weekdays and only compare time-of-day
							if (endCondition.timeOfDayMs <= startCondition.timeOfDayMs) {
								ctx.addIssue({
									code: 'custom',
									path: [endConditionIndex, 'timeOfDayMs'],
									message: 'End time must be after start time'
								});
							}
							return;
						}

						if (endAt == null) {
							return;
						}

						if (endAt <= now) {
							ctx.addIssue({
								code: 'custom',
								path: [endConditionIndex, 'timeOfDayMs'],
								message: 'Choose a future time'
							});
						}
						if (startCondition.mode === 'afterDelay' && endAt <= now + startCondition.offsetMs) {
							ctx.addIssue({
								code: 'custom',
								path: [endConditionIndex, 'timeOfDayMs'],
								message: 'End time must be after start time'
							});
						}
						if (startAt != null && endAt <= startAt) {
							ctx.addIssue({
								code: 'custom',
								path: [endConditionIndex, 'timeOfDayMs'],
								message: 'End time must be after start time'
							});
						}
					})
			}
		},
		validator: {
			'~standard': {
				version: 1,
				vendor: 'abstand',
				validate(value) {
					const formData = value as TNewBlockIntentionFormData;
					if (formData.scope === 'wholeDevice' || formData.selectedTargets.length > 0) {
						return { value: formData };
					}

					return {
						issues: [
							{
								path: ['selectedTargets'],
								message: 'Choose at least one app or website'
							}
						]
					};
				}
			}
		} satisfies TFormValidator<TNewBlockIntentionFormData>,
		validateOn: ['submit'],
		revalidateOn: ['submit', 'blur', 'change']
	});

	constructor(intentionsCx: IntentionsCx) {
		this.intentionsCx = intentionsCx;
	}

	public getCondition(
		transition: specta.IntentionConditionTransition
	): TNewIntentionConditionFormData | null {
		return (
			this.$form.fields.conditions
				.get()
				?.find((condition) => condition.transition === transition) ?? null
		);
	}

	public upsertCondition(nextCondition: TNewIntentionConditionFormData): void {
		const conditions = this.$form.fields.conditions.get() ?? [];
		const nextConditions = conditions.filter(
			(condition) => condition.transition !== nextCondition.transition
		);
		if (nextCondition.transition === 'start') {
			this.$form.fields.conditions.set([nextCondition, ...nextConditions]);
			return;
		}

		this.$form.fields.conditions.set([...nextConditions, nextCondition]);
	}

	public updateCondition(
		transition: specta.IntentionConditionTransition,
		update: Partial<Omit<TNewIntentionConditionFormData, 'transition'>>
	): void {
		this.upsertCondition({
			...(this.getCondition(transition) ?? createDefaultNewIntentionCondition(transition)),
			...update
		});
	}

	public setConditionMode(
		transition: specta.IntentionConditionTransition,
		mode: TNewIntentionConditionMode
	): void {
		this.updateCondition(transition, { mode });
	}

	public async submit(): Promise<TResult<specta.Intention, TNewBlockIntentionSubmitError>> {
		const formData = this.$form.getValidData();
		if (formData == null) {
			return Err({ code: 'invalidForm' });
		}

		const startCondition =
			formData.conditions.find((condition) => condition.transition === 'start') ?? null;

		const targets = formData.selectedTargets.map((item): specta.WriteIntentionBlockTargetParams => {
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
		});

		const [isIntentionOk, intentionErr, intention] = await this.intentionsCx.create({
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
							transition: condition.transition,
							rule: { type: 'manual' }
						};
					case 'now':
						// Note: "Start now" is an immediate action; manual is the reusable persisted trigger
						return {
							transition: condition.transition,
							rule: { type: 'manual' }
						};
					case 'afterDelay': {
						const date = new Date(Date.now() + condition.offsetMs);
						return {
							transition: condition.transition,
							rule: {
								type: 'dateTime',
								dateEpochDays: getLocalDateEpochDays(date),
								timeOfDayMs: getLocalTimeOfDayMs(date)
							}
						};
					}
					case 'afterDuration':
						return {
							transition: condition.transition,
							rule: {
								type: 'afterTransition',
								anchorTransition: 'start',
								offsetMs: condition.offsetMs
							}
						};
					case 'atTime':
						if (condition.transition === 'end' && startCondition?.mode === 'repeats') {
							return {
								transition: condition.transition,
								rule: {
									type: 'schedule',
									timeOfDayMs: condition.timeOfDayMs,
									weekdaysMask: startCondition.weekdaysMask
								}
							};
						}

						return {
							transition: condition.transition,
							rule: {
								type: 'dateTime',
								dateEpochDays: condition.dateEpochDays,
								timeOfDayMs: condition.timeOfDayMs
							}
						};
					case 'repeats':
						return {
							transition: condition.transition,
							rule: {
								type: 'schedule',
								timeOfDayMs: condition.timeOfDayMs,
								weekdaysMask: condition.weekdaysMask
							}
						};
				}
			})
		});
		if (!isIntentionOk) {
			return Err({ code: 'createFailed', message: intentionErr });
		}

		const shouldStartNow = formData.conditions.some(
			(condition) => condition.transition === 'start' && condition.mode === 'now'
		);
		if (shouldStartNow) {
			const [isStartOk, startErr] = await this.intentionsCx.start(intention.id);
			if (!isStartOk) {
				return Err({ code: 'startFailed', message: startErr, intention });
			}
		}

		return Ok(intention);
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
	transition: specta.IntentionConditionTransition;
	mode: TNewIntentionConditionMode;
	dateEpochDays: specta.DateOnly;
	timeOfDayMs: specta.TimeOnly;
	offsetMs: number;
	weekdaysMask: specta.WeekdayMask | null;
}

export type TNewIntentionConditionMode =
	| 'now'
	| 'atTime'
	| 'afterDelay'
	| 'afterDuration'
	| 'repeats'
	| 'manual';

export type TNewBlockIntentionSubmitError =
	| { code: 'invalidForm' }
	| { code: 'createFailed'; message: string }
	| { code: 'startFailed'; message: string; intention: specta.Intention };

export function createDefaultNewIntentionCondition(
	transition: specta.IntentionConditionTransition
): TNewIntentionConditionFormData {
	return {
		transition,
		mode: transition === 'start' ? 'now' : 'manual',
		dateEpochDays: getCurrentDateEpochDays(),
		timeOfDayMs:
			transition === 'start'
				? timeOnlyFromMs(9 * 60 * 60 * 1_000)
				: timeOnlyFromMs(17 * 60 * 60 * 1_000),
		offsetMs: 30 * 60_000,
		weekdaysMask: null
	};
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
