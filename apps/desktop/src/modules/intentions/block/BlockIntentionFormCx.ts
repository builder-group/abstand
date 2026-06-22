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
import { getCatalogItemKey, isWebsiteCatalogItem, type TCatalogItem } from '@/modules/catalog';

export class BlockIntentionFormCx {
	public readonly mode: TBlockIntentionFormMode;
	public readonly $form: TForm<TBlockIntentionFormData, [TDirtyFeature<TBlockIntentionFormData>]>;
	// Note: Incremented after resets so React field UIs can remount local state
	public readonly $resetRevision = createState(0);

	constructor(options: TBlockIntentionFormCxOptions = {}) {
		const {
			mode = 'create',
			initialData = createDefaultBlockIntentionFormData(),
			validationContext: validationContextInput = null
		} = options;
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
				baseTargets: {
					defaultValue: [...initialData.baseTargets],
					validator: z.array(z.custom<TCatalogItem>())
				},
				exceptionTargets: {
					defaultValue: [...initialData.exceptionTargets],
					validator: z.array(z.custom<TCatalogItem>())
				},
				enforcementMode: {
					defaultValue: initialData.enforcementMode,
					validator: z.enum(['casual', 'balanced', 'strict'])
				},
				balancedDelayMs: {
					defaultValue: initialData.balancedDelayMs,
					validator: z
						.number()
						.int()
						.min(
							blockIntentionFormConfig.balancedDelay.minMs,
							`Balanced pause must be at least ${formatBalancedDelayMs(
								blockIntentionFormConfig.balancedDelay.minMs
							)}`
						)
						.max(
							blockIntentionFormConfig.balancedDelay.maxMs,
							`Balanced pause must be ${formatBalancedDelayMs(
								blockIntentionFormConfig.balancedDelay.maxMs
							)} or less`
						)
				},
				conditions: {
					defaultValue: initialData.conditions.map((condition) => ({ ...condition })),
					validator: createConditionsValidator(mode, validationContextInput)
				}
			},
			validator: blockIntentionFormValidator,
			validateOn: ['submit'],
			revalidateOn: ['submit', 'blur', 'change']
		}).with(dirtyFeature<TBlockIntentionFormData>());
	}

	public static fromIntention(
		intention: specta.Intention,
		options: Omit<TBlockIntentionFormCxOptions, 'initialData' | 'mode'> = {}
	): BlockIntentionFormCx | null {
		const initialData = getFormDataFromIntention(intention);
		if (initialData == null) {
			return null;
		}

		return new BlockIntentionFormCx({
			mode: 'edit',
			initialData,
			...options
		});
	}

	public resetToIntention(intention: specta.Intention): void {
		const formData = getFormDataFromIntention(intention);
		if (formData == null) {
			throw new Error('BlockIntentionFormCx can only reset from a block intention');
		}

		this.$form.fields.name.defaultValue = formData.name;
		this.$form.fields.scope.defaultValue = formData.scope;
		this.$form.fields.baseTargets.defaultValue = [...formData.baseTargets];
		this.$form.fields.exceptionTargets.defaultValue = [...formData.exceptionTargets];
		this.$form.fields.enforcementMode.defaultValue = formData.enforcementMode;
		this.$form.fields.balancedDelayMs.defaultValue = formData.balancedDelayMs;
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
		if (mode !== 'atTime') {
			this.updateCondition(transition, { mode });
			return;
		}

		switch (transition) {
			case 'start':
				this.setStartAtTimeMode();
				return;
			case 'end':
				this.setEndAtTimeMode();
				return;
		}
	}

	private setStartAtTimeMode(): void {
		const condition = this.getCondition('start') ?? createDefaultBlockIntentionCondition('start');
		const futureDateTime = getDefaultFutureDateTime(15 * 60_000);
		this.upsertCondition({
			...condition,
			mode: 'atTime',
			dateEpochDays: futureDateTime.dateEpochDays,
			timeOfDayMs: futureDateTime.timeOfDayMs
		});
	}

	private setEndAtTimeMode(): void {
		const condition = this.getCondition('end') ?? createDefaultBlockIntentionCondition('end');

		const startCondition = this.getCondition('start');
		if (startCondition?.mode === 'repeats') {
			const cappedSameDayEndTimeOfDayMs = Math.min(
				startCondition.timeOfDayMs + 60 * 60_000,
				24 * 60 * 60_000 - 60_000
			);
			this.upsertCondition({
				...condition,
				mode: 'atTime',
				timeOfDayMs: timeOnlyFromMs(cappedSameDayEndTimeOfDayMs)
			});
			return;
		}

		let futureDateTime = getDefaultFutureDateTime(60 * 60_000);
		if (startCondition?.mode === 'atTime') {
			const startAt = getLocalDateTime(
				startCondition.dateEpochDays,
				startCondition.timeOfDayMs
			).getTime();
			futureDateTime = getDefaultFutureDateTime(60 * 60_000, startAt);
		}
		if (startCondition?.mode === 'afterDelay') {
			futureDateTime = getDefaultFutureDateTime(startCondition.offsetMs + 60 * 60_000);
		}
		this.upsertCondition({
			...condition,
			mode: 'atTime',
			dateEpochDays: futureDateTime.dateEpochDays,
			timeOfDayMs: futureDateTime.timeOfDayMs
		});
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
		const targetActions = getTargetActionsForScope(formData.scope);
		return {
			name: formData.name.trim(),
			behavior: {
				type: 'block',
				scope: formData.scope,
				enforcementMode: formData.enforcementMode,
				balancedDelayMs: formData.balancedDelayMs,
				targets:
					targetActions != null
						? [
								...formData.baseTargets.map((item) =>
									getWritableTargetParam(item, targetActions.base)
								),
								...formData.exceptionTargets
									.filter(isWebsiteCatalogItem)
									.map((item) => getWritableTargetParam(item, targetActions.exception))
							]
						: []
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
	validationContext?: TBlockIntentionFormValidationContextInput;
}

export type TBlockIntentionFormMode = 'create' | 'edit';

type TBlockIntentionFormValidationContextInput =
	| TBlockIntentionFormValidationContext
	| (() => TBlockIntentionFormValidationContext | null)
	| null;

interface TBlockIntentionFormValidationContext {
	activeSessionStartedAt?: number;
	baselineIntention?: specta.Intention;
}

export interface TBlockIntentionFormData {
	name: string;
	scope: specta.IntentionBlockScope;
	baseTargets: TCatalogItem[];
	exceptionTargets: TCatalogItem[];
	enforcementMode: specta.IntentionEnforcementMode;
	balancedDelayMs: number;
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

	const block = intention.behavior;
	const targetActions = getTargetActionsForScope(block.scope);
	return {
		name: intention.name,
		scope: block.scope,
		baseTargets: targetActions == null ? [] : getCatalogItemsForAction(block, targetActions.base),
		exceptionTargets:
			targetActions == null ? [] : getCatalogItemsForAction(block, targetActions.exception),
		enforcementMode: block.enforcementMode,
		balancedDelayMs: block.balancedDelayMs,
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

function getCatalogItemsForAction(
	block: Extract<specta.IntentionBehavior, { type: 'block' }>,
	action: specta.IntentionBlockTargetAction
): TCatalogItem[] {
	return [
		...block.appTargets
			.filter((target) => target.action === action)
			.map(
				(target): TCatalogItem => ({
					type: 'app',
					app: {
						stableId: target.app.stableId,
						name: target.app.name,
						bundleId: target.app.bundleId,
						processPath: target.app.processPath,
						icon: target.app.icon,
						color: target.app.color
					}
				})
			),
		...block.websiteTargets
			.filter((target) => target.action === action)
			.map(
				(target): TCatalogItem => ({
					type: 'website',
					website: {
						hostname: target.website.hostname,
						name: target.website.name,
						icon: target.website.icon,
						color: target.website.color
					}
				})
			)
	];
}

function getWritableTargetParam(
	item: TCatalogItem,
	action: specta.IntentionBlockTargetAction
): specta.WriteIntentionBlockTargetParams {
	switch (item.type) {
		case 'app':
			return {
				type: 'app',
				action,
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
				action,
				hostname: item.website.hostname,
				name: item.website.name,
				icon: item.website.icon,
				color: item.website.color
			};
	}
}

function getTargetActionsForScope(scope: specta.IntentionBlockScope): TBlockTargetActions | null {
	switch (scope) {
		case 'blockTargets':
			return { base: 'block', exception: 'allow' };
		case 'allowTargets':
			return { base: 'allow', exception: 'block' };
		case 'wholeDevice':
			return null;
	}
}

interface TBlockTargetActions {
	base: specta.IntentionBlockTargetAction;
	exception: specta.IntentionBlockTargetAction;
}

export function createDefaultBlockIntentionFormData(): TBlockIntentionFormData {
	return {
		name: '',
		scope: 'blockTargets',
		baseTargets: [],
		exceptionTargets: [],
		enforcementMode: 'balanced',
		balancedDelayMs: blockIntentionFormConfig.balancedDelay.defaultMs,
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

function getDefaultFutureDateTime(offsetMs: number, baseMs = Date.now()): TDefaultFutureDateTime {
	const futureMs = baseMs + offsetMs;
	const stepMs = 5 * 60_000;
	const roundedFutureMs = Math.ceil(futureMs / stepMs) * stepMs;
	const date = new Date(roundedFutureMs);

	return {
		dateEpochDays: getLocalDateEpochDays(date),
		timeOfDayMs: getLocalTimeOfDayMs(date)
	};
}

interface TDefaultFutureDateTime {
	dateEpochDays: specta.DateOnly;
	timeOfDayMs: specta.TimeOnly;
}

// MARK: - Validation

function createConditionsValidator(
	mode: TBlockIntentionFormMode,
	validationContextInput: TBlockIntentionFormValidationContextInput
) {
	return z
		.array(
			z.object({
				transition: z.enum(['start', 'end']),
				mode: z.enum(['now', 'atTime', 'afterDelay', 'afterDuration', 'repeats', 'manual']),
				dateEpochDays: z
					.custom<specta.DateOnly>(
						(value) => typeof value === 'number' && isDateEpochDays(value),
						'Enter a valid date'
					)
					.refine(
						(dateEpochDays) =>
							dateEpochDays <=
							getLocalDateEpochDays(
								new Date(Date.now() + blockIntentionFormConfig.conditionDuration.maxMs)
							),
						'Choose a date within 5 years'
					),
				timeOfDayMs: z.custom<specta.TimeOnly>(
					(value) => typeof value === 'number' && isTimeOfDayMs(value),
					'Enter a valid time'
				),
				offsetMs: z
					.number()
					.int()
					.min(blockIntentionFormConfig.conditionDuration.minMs)
					.max(blockIntentionFormConfig.conditionDuration.maxMs, 'Choose a duration up to 5 years')
					.refine(
						(offsetMs) => offsetMs % blockIntentionFormConfig.conditionDuration.stepMs === 0,
						'Duration must use whole minutes'
					),
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

			const { activeSessionStartedAt, baselineIntention } =
				resolveValidationContext(validationContextInput);
			const isActive = activeSessionStartedAt != null;

			const baselineStartAt = getBaselineDateTimeConditionAt(baselineIntention, 'start');
			const hasStartAtChanged = startAt !== baselineStartAt;

			// Note: Active sessions may keep historical one-shot starts, but changed values must be future
			if (startAt != null && startAt <= now && (!isActive || hasStartAtChanged)) {
				ctx.addIssue({
					code: 'custom',
					path: [startConditionIndex, 'timeOfDayMs'],
					message: 'Choose a future time'
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

			const baselineEndAt = getBaselineDateTimeConditionAt(baselineIntention, 'end');
			const hasEndAtChanged = endAt !== baselineEndAt;

			// Note: Active sessions may keep historical one-shot ends, but changed values must be future
			if (endAt <= now && (!isActive || hasEndAtChanged)) {
				ctx.addIssue({
					code: 'custom',
					path: [endConditionIndex, 'timeOfDayMs'],
					message: 'Choose a future time'
				});
			}
			if (
				mode === 'create' &&
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

function getBaselineDateTimeConditionAt(
	intention: specta.Intention | undefined,
	transition: specta.IntentionConditionTransition
): number | null {
	const condition = intention?.conditions.find((condition) => condition.transition === transition);
	if (condition?.rule.type !== 'dateTime') {
		return null;
	}

	return condition.rule.triggerAt;
}

function resolveValidationContext(
	input: TBlockIntentionFormValidationContextInput
): TBlockIntentionFormValidationContext {
	if (typeof input === 'function') {
		return input() ?? {};
	}

	return input ?? {};
}

const blockIntentionFormValidator = {
	'~standard': {
		version: 1,
		vendor: 'abstand',
		validate(value) {
			const formData = value as TBlockIntentionFormData;
			if (formData.scope === 'wholeDevice') {
				return { value: formData };
			}
			if (formData.baseTargets.length === 0) {
				return {
					issues: [
						{
							path: ['baseTargets'],
							message: 'Choose at least one app or website'
						}
					]
				};
			}

			const duplicateException = formData.exceptionTargets
				.filter(isWebsiteCatalogItem)
				.find((exceptionTarget) => {
					const exceptionTargetKey = getCatalogItemKey(exceptionTarget);
					return formData.baseTargets.some(
						(baseTarget) => getCatalogItemKey(baseTarget) === exceptionTargetKey
					);
				});
			if (duplicateException != null) {
				return {
					issues: [
						{
							path: ['exceptionTargets'],
							message: 'A target cannot be both a base target and an exception'
						}
					]
				};
			}

			return { value: formData };
		}
	}
} satisfies TFormValidator<TBlockIntentionFormData>;

// MARK: - Config

export const blockIntentionFormConfig = {
	balancedDelay: {
		defaultMs: 15_000,
		minMs: 5_000,
		maxMs: 120_000,
		stepMs: 5_000
	},
	conditionDuration: {
		minMs: 60_000,
		maxMs: 5 * 365 * 24 * 60 * 60_000,
		stepMs: 60_000
	},
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

function formatBalancedDelayMs(delayMs: number): string {
	const seconds = delayMs / 1_000;
	return `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
}
