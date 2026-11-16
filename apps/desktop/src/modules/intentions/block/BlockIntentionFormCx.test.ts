import { describe, expect, it, vi } from 'vitest';
import { type specta } from '@/environment';
import { timeOnlyFromMs, weekdayMaskFromWeekdays } from '@/lib/date';
import { BlockIntentionFormCx } from './BlockIntentionFormCx';

vi.mock('@/modules/catalog', () => ({ getCatalogItemKey: vi.fn() }));
vi.mock('@/lib', async () => import('@/lib/date'));

describe('BlockIntentionFormCx class', () => {
	it.each([
		['Monday', weekdayMaskFromWeekdays(['mon']), weekdayMaskFromWeekdays(['tue'])],
		['Sunday', weekdayMaskFromWeekdays(['sun']), weekdayMaskFromWeekdays(['mon'])],
		[
			'consecutive days',
			weekdayMaskFromWeekdays(['mon', 'tue']),
			weekdayMaskFromWeekdays(['tue', 'wed'])
		],
		['every day', null, null],
		[
			'all selected days',
			weekdayMaskFromWeekdays(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']),
			weekdayMaskFromWeekdays(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])
		]
	])(
		'should save midnight boundaries for %s and restore all-day mode',
		async (_, weekdaysMask, endMask) => {
			const form = createForm();
			form.updateCondition('start', { mode: 'repeats', allDay: true, weekdaysMask });
			// A hidden end time must not constrain an all-day schedule.
			form.updateCondition('end', { mode: 'atTime', timeOfDayMs: timeOnlyFromMs(0) });

			await form.$form.validate();
			const params = form.getValidCreateIntentionParams();

			expect(params?.conditions).toEqual([
				{ transition: 'start', rule: { type: 'schedule', timeOfDayMs: 0, weekdaysMask } },
				{ transition: 'end', rule: { type: 'schedule', timeOfDayMs: 0, weekdaysMask: endMask } }
			]);
			if (params == null) {
				throw new Error('Expected valid all-day parameters');
			}
			const saved = toIntention(params);
			const reopened = BlockIntentionFormCx.fromIntention(saved);
			if (reopened == null) {
				throw new Error('Expected block intention form');
			}
			expect(reopened.getCondition('start')).toMatchObject({ allDay: true, weekdaysMask });
			await reopened.$form.validate();
			expect(reopened.getValidUpdateIntentionParams(saved.id)?.conditions).toEqual(
				params?.conditions
			);
		}
	);

	it('should retain the previous times and end mode when all-day mode is turned off', async () => {
		const form = createForm();
		form.updateCondition('start', { mode: 'repeats', allDay: true });
		form.updateCondition('end', { mode: 'afterDuration', offsetMs: 60 * 60_000 });
		form.updateCondition('start', { allDay: false });

		await form.$form.validate();
		const params = form.getValidCreateIntentionParams();

		expect(params?.conditions[0]?.rule).toMatchObject({
			type: 'schedule',
			timeOfDayMs: 9 * 60 * 60_000
		});
		expect(params?.conditions[1]?.rule).toEqual({
			type: 'afterTransition',
			anchorTransition: 'start',
			offsetMs: 60 * 60_000
		});
	});

	it('should still reject timed schedule ends before the start', async () => {
		const form = createForm();
		form.updateCondition('start', { mode: 'repeats' });
		form.updateCondition('end', { mode: 'atTime', timeOfDayMs: timeOnlyFromMs(0) });

		expect(await form.$form.validate()).toBe(false);
		expect(form.getValidCreateIntentionParams()).toBeNull();
	});
});

function createForm(): BlockIntentionFormCx {
	const form = new BlockIntentionFormCx();
	form.$form.fields.name.set('All-day block');
	form.$form.fields.scope.set('wholeDevice');
	return form;
}

function toIntention(params: specta.CreateIntentionParams): specta.Intention {
	return {
		id: 1,
		name: params.name,
		behavior: {
			type: 'block',
			scope: 'wholeDevice',
			enforcementMode: 'balanced',
			balancedDelayMs: 30_000,
			appTargets: [],
			websiteTargets: []
		},
		conditions: params.conditions.map((condition, index) => {
			if (condition.rule.type !== 'schedule') {
				throw new Error('Expected schedule rule');
			}
			return {
				transition: condition.transition,
				rule: condition.rule,
				id: index + 1,
				createdAt: Date.now(),
				updatedAt: Date.now()
			};
		}),
		pausedAt: null,
		resumedAt: null,
		createdAt: Date.now(),
		updatedAt: Date.now()
	};
}
