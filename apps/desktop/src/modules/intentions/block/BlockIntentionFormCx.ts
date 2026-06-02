import {
	createForm,
	dirtyFeature,
	type TDirtyFeature,
	type TForm,
	type TFormValidator
} from 'feature-form';
import { createState } from 'feature-state';
import * as z from 'zod';
import { type specta } from '@/environment';
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

// MARK: - Form Cx

export class BlockIntentionFormCx {
	public readonly mode: TBlockIntentionFormMode;
	public readonly $form: TForm<TBlockIntentionFormData, [TDirtyFeature<TBlockIntentionFormData>]>;
	// Note: Incremented after resets so React field UIs can remount local state
	public readonly $resetRevision = createState(0);

	constructor(options: TBlockIntentionFormCxOptions = {}) {
		const { mode = 'create', initialData = createDefaultBlockIntentionFormData() } = options;
		this.mode = mode;
		this.$form = createForm<TBlockIntentionFormData>({
			fields: {
				name: {
					defaultValue: initialData.name,
					validator: z
						.string()
						.trim()
						.min(1, 'Please enter a name')
						.max(80, 'Name must be 80 characters or less')
				},
				scope: {
					defaultValue: initialData.scope,
					validator: z.enum(['blockTargets', 'allowTargets', 'wholeDevice'])
				},
				selectedTargets: {
					defaultValue: [...initialData.selectedTargets],
					validator: z.array(z.custom<TCatalogItem>())
				},
				enforcementMode: {
					defaultValue: initialData.enforcementMode,
					validator: z.enum(['casual', 'balanced', 'strict'])
				},
				conditions: {
					defaultValue: initialData.conditions.map((condition) => ({ ...condition })),
					validator: createConditionsValidator(mode)
				}
			},
			validator: blockIntentionFormValidator,
			validateOn: ['submit'],
			revalidateOn: ['submit', 'blur', 'change']
		}).with(dirtyFeature<TBlockIntentionFormData>());
	}

	public static fromIntention(intention: specta.Intention): BlockIntentionFormCx | null {
		const initialData = getFormDataFromIntention(intention);
		if (initialData == null) {
			return null;
		}

		return new BlockIntentionFormCx({
			mode: 'edit',
			initialData
		});
	}

	public resetToIntention(intention: specta.Intention): void {
		const formData = getFormDataFromIntention(intention);
		if (formData == null) {
			throw new Error('BlockIntentionFormCx can only reset from a block intention');
		}

		this.$form.fields.name.defaultValue = formData.name;
		this.$form.fields.scope.defaultValue = formData.scope;
		this.$form.fields.selectedTargets.defaultValue = [...formData.selectedTargets];
		this.$form.fields.enforcementMode.defaultValue = formData.enforcementMode;
		this.$form.fields.conditions.defaultValue = formData.conditions.map((condition) => ({
			...condition
		}));

		this.$form.reset();
		this.$form.resetDirty();
		this.$resetRevision.set((revision) => revision + 1);
	}

	public getCondition(
		transition: specta.IntentionConditionTransition
	): TBlockIntentionConditionFormData | null {
		return (
			this.$form.fields.conditions
				.get()
				?.find((condition) => condition.transition === transition) ?? null
		);
	}

	public upsertCondition(nextCondition: TBlockIntentionConditionFormData): void {
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
		update: Partial<Omit<TBlockIntentionConditionFormData, 'transition'>>
	): void {
		this.upsertCondition({
			...(this.getCondition(transition) ?? createDefaultBlockIntentionCondition(transition)),
			...update
		});
	}

	public setConditionMode(
		transition: specta.IntentionConditionTransition,
		mode: TBlockIntentionConditionMode
	): void {
		this.updateCondition(transition, { mode });
	}

	public getConditionModeOptions(
		transition: specta.IntentionConditionTransition
	): readonly TBlockIntentionConditionModeOption[] {
		return conditionModeOptionsByFormMode[this.mode][transition];
	}

	public getValidCreateIntentionParams(): specta.CreateIntentionParams | null {
		const formData = this.$form.getValidData();
		if (formData == null) {
			return null;
		}

		const startCondition =
			formData.conditions.find((condition) => condition.transition === 'start') ?? null;
		return {
			name: formData.name.trim(),
			behavior: {
				type: 'block',
				scope: formData.scope,
				enforcementMode: formData.enforcementMode,
				targets: formData.selectedTargets.map((item): specta.WriteIntentionBlockTargetParams => {
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
				})
			},
			conditions: formData.conditions.map((condition): specta.WriteIntentionConditionParams => {
				switch (condition.mode) {
					case 'manual': {
						return {
							transition: condition.transition,
							rule: { type: 'manual' }
						};
					}
					case 'now': {
						// Note: "Start now" is an immediate action; manual is the reusable persisted trigger
						return {
							transition: condition.transition,
							rule: { type: 'manual' }
						};
					}
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
					case 'afterDuration': {
						return {
							transition: condition.transition,
							rule: {
								type: 'afterTransition',
								anchorTransition: 'start',
								offsetMs: condition.offsetMs
							}
						};
					}
					case 'atTime': {
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
					}
					case 'repeats': {
						return {
							transition: condition.transition,
							rule: {
								type: 'schedule',
								timeOfDayMs: condition.timeOfDayMs,
								weekdaysMask: condition.weekdaysMask
							}
						};
					}
				}
			})
		};
	}

	public getValidUpdateIntentionParams(intentionId: number): specta.UpdateIntentionParams | null {
		const params = this.getValidCreateIntentionParams();
		if (params == null) {
			return null;
		}

		return {
			intentionId,
			...params
		};
	}
}

interface TBlockIntentionFormCxOptions {
	mode?: TBlockIntentionFormMode;
	initialData?: TBlockIntentionFormData;
}

export type TBlockIntentionFormMode = 'create' | 'edit';

export interface TBlockIntentionFormData {
	name: string;
	scope: specta.IntentionBlockScope;
	selectedTargets: TCatalogItem[];
	enforcementMode: specta.IntentionEnforcementMode;
	conditions: TBlockIntentionConditionFormData[];
}

export interface TBlockIntentionConditionFormData {
	transition: specta.IntentionConditionTransition;
	mode: TBlockIntentionConditionMode;
	dateEpochDays: specta.DateOnly;
	timeOfDayMs: specta.TimeOnly;
	offsetMs: number;
	weekdaysMask: specta.WeekdayMask | null;
}

export type TBlockIntentionConditionMode =
	| 'now'
	| 'atTime'
	| 'afterDelay'
	| 'afterDuration'
	| 'repeats'
	| 'manual';

export interface TBlockIntentionConditionModeOption {
	value: TBlockIntentionConditionMode;
	label: string;
}

function getFormDataFromIntention(intention: specta.Intention): TBlockIntentionFormData | null {
	if (intention.behavior.type !== 'block') {
		return null;
	}

	return {
		name: intention.name,
		scope: intention.behavior.scope,
		selectedTargets: [
			...intention.behavior.apps.map(
				(app): TCatalogItem => ({
					type: 'app',
					app: {
						stableId: app.stableId,
						name: app.name,
						bundleId: app.bundleId,
						processPath: app.processPath,
						icon: app.icon,
						color: app.color
					}
				})
			),
			...intention.behavior.websites.map(
				(website): TCatalogItem => ({
					type: 'website',
					website: {
						hostname: website.hostname,
						name: website.name,
						icon: website.icon,
						color: website.color
					}
				})
			)
		],
		enforcementMode: intention.behavior.enforcementMode,
		conditions: (['start', 'end'] as const).map((transition) => {
			const condition =
				intention.conditions.find((candidate) => candidate.transition === transition) ?? null;
			if (condition == null) {
				return createDefaultBlockIntentionCondition(transition);
			}

			const defaultCondition = createDefaultBlockIntentionCondition(condition.transition);
			switch (condition.rule.type) {
				case 'manual':
					return {
						...defaultCondition,
						mode: 'manual'
					};
				case 'dateTime':
					return {
						...defaultCondition,
						mode: 'atTime',
						dateEpochDays: condition.rule.dateEpochDays,
						timeOfDayMs: condition.rule.timeOfDayMs
					};
				case 'afterTransition':
					return {
						...defaultCondition,
						mode: 'afterDuration',
						offsetMs: condition.rule.offsetMs
					};
				case 'schedule':
					return {
						...defaultCondition,
						mode: condition.transition === 'start' ? 'repeats' : 'atTime',
						timeOfDayMs: condition.rule.timeOfDayMs,
						weekdaysMask: condition.rule.weekdaysMask
					};
			}
		})
	};
}

export function createDefaultBlockIntentionFormData(): TBlockIntentionFormData {
	return {
		name: '',
		scope: 'blockTargets',
		selectedTargets: [],
		enforcementMode: 'balanced',
		conditions: [
			createDefaultBlockIntentionCondition('start'),
			createDefaultBlockIntentionCondition('end')
		]
	};
}

export function createDefaultBlockIntentionCondition(
	transition: specta.IntentionConditionTransition
): TBlockIntentionConditionFormData {
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

// MARK: - Validation

function createConditionsValidator(mode: TBlockIntentionFormMode) {
	return z
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
			const endConditionIndex = conditions.findIndex((condition) => condition.transition === 'end');
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
					? getLocalDateTime(startCondition.dateEpochDays, startCondition.timeOfDayMs).getTime()
					: null;
			const isRepeatingScheduleEnd =
				startCondition.mode === 'repeats' && endCondition.mode === 'atTime';
			const endAt =
				endCondition.mode === 'atTime' && !isRepeatingScheduleEnd
					? getLocalDateTime(endCondition.dateEpochDays, endCondition.timeOfDayMs).getTime()
					: null;
			const shouldValidateFutureTimes = mode === 'create';

			if (shouldValidateFutureTimes && startAt != null && startAt <= now) {
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

			if (shouldValidateFutureTimes && endAt <= now) {
				ctx.addIssue({
					code: 'custom',
					path: [endConditionIndex, 'timeOfDayMs'],
					message: 'Choose a future time'
				});
			}
			if (
				shouldValidateFutureTimes &&
				startCondition.mode === 'afterDelay' &&
				endAt <= now + startCondition.offsetMs
			) {
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
		});
}

const blockIntentionFormValidator = {
	'~standard': {
		version: 1,
		vendor: 'abstand',
		validate(value) {
			const formData = value as TBlockIntentionFormData;
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
} satisfies TFormValidator<TBlockIntentionFormData>;

// MARK: - Config

export const blockIntentionFormConfig = {
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

const conditionModeOptionsByFormMode = {
	create: {
		start: [
			{ value: 'now', label: 'Start now' },
			{ value: 'atTime', label: 'At time' },
			{ value: 'afterDelay', label: 'After delay' },
			{ value: 'repeats', label: 'Repeats' },
			{ value: 'manual', label: 'Manually' }
		],
		end: [
			{ value: 'afterDuration', label: 'After duration' },
			{ value: 'atTime', label: 'At time' },
			{ value: 'manual', label: 'Manually' }
		]
	},
	edit: {
		start: [
			{ value: 'atTime', label: 'At time' },
			{ value: 'repeats', label: 'Repeats' },
			{ value: 'manual', label: 'Manually' }
		],
		end: [
			{ value: 'afterDuration', label: 'After duration' },
			{ value: 'atTime', label: 'At time' },
			{ value: 'manual', label: 'Manually' }
		]
	}
} as const satisfies Record<
	TBlockIntentionFormMode,
	Record<specta.IntentionConditionTransition, readonly TBlockIntentionConditionModeOption[]>
>;
