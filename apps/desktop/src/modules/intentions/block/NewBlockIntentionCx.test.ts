import { Ok } from 'tuple-result';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type specta } from '@/environment';
import { weekdayMaskFromWeekdays } from '@/lib/date';
import { IntentionsCx } from '../IntentionsCx';
import { NewBlockIntentionCx } from './NewBlockIntentionCx';

vi.mock('@/environment', () => ({ specta: {} }));
vi.mock('@/modules/catalog', () => ({ getCatalogItemKey: vi.fn() }));
vi.mock('@/lib', async () => import('@/lib/date'));

describe('NewBlockIntentionCx class', () => {
	afterEach(() => vi.useRealTimers());

	it.each([
		['Monday', new Date(2026, 10, 16, 14, 30), weekdayMaskFromWeekdays(['mon']), true],
		['unselected Monday', new Date(2026, 10, 16, 14, 30), weekdayMaskFromWeekdays(['tue']), false],
		['Sunday', new Date(2026, 10, 22, 14, 30), weekdayMaskFromWeekdays(['sun']), true],
		['every day', new Date(2026, 10, 16, 14, 30), null, true]
	])(
		'should start a new all-day schedule immediately for %s only when today is selected',
		async (_, now, weekdaysMask, shouldStart) => {
			vi.useFakeTimers();
			vi.setSystemTime(now);
			const intentions = new IntentionsCx();
			const create = vi.spyOn(intentions, 'create').mockResolvedValue(Ok(savedIntention));
			const start = vi.spyOn(intentions, 'start').mockResolvedValue(
				Ok({
					id: 1,
					intentionId: 1,
					status: 'active',
					startedAt: now.getTime(),
					startConditionId: null,
					endedAt: null,
					endConditionId: null,
					createdAt: now.getTime(),
					updatedAt: now.getTime()
				})
			);
			const cx = new NewBlockIntentionCx(intentions);
			cx.formCx.$form.fields.name.set('All-day block');
			cx.formCx.$form.fields.scope.set('wholeDevice');
			cx.formCx.updateCondition('start', { mode: 'repeats', allDay: true, weekdaysMask });
			await cx.formCx.$form.validate();

			const [isOk] = await cx.submit();

			expect(isOk).toBe(true);
			expect(create).toHaveBeenCalledOnce();
			expect(cx.shouldStartNow()).toBe(shouldStart);
			if (shouldStart) {
				expect(start).toHaveBeenCalledExactlyOnceWith(savedIntention.id);
			} else {
				expect(start).not.toHaveBeenCalled();
			}
		}
	);

	it('should not immediately start a timed repeating schedule', () => {
		const cx = new NewBlockIntentionCx(new IntentionsCx());
		cx.formCx.updateCondition('start', { mode: 'repeats', allDay: false });
		expect(cx.shouldStartNow()).toBe(false);
	});

	it('should keep explicit Start now behavior', () => {
		const cx = new NewBlockIntentionCx(new IntentionsCx());
		expect(cx.shouldStartNow()).toBe(true);
	});
});

const savedIntention: specta.Intention = {
	id: 1,
	name: 'All-day block',
	behavior: {
		type: 'block',
		scope: 'wholeDevice',
		enforcementMode: 'balanced',
		balancedDelayMs: 30_000,
		appTargets: [],
		websiteTargets: []
	},
	conditions: [],
	pausedAt: null,
	resumedAt: null,
	createdAt: 0,
	updatedAt: 0
};
