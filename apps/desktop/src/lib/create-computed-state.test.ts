import { createState, EStateListenerQueuePriority } from 'feature-state';
import { describe, expect, it, vi } from 'vitest';
import { createComputedState } from './create-computed-state';

describe('createComputedState', () => {
	it('should compute the initial value from its source states', () => {
		// Prepare
		const $left = createState(2);
		const $right = createState(3);

		// Act
		const $sum = createComputedState([$left, $right], ([left, right]) => left + right);

		// Assert
		expect($sum.get()).toBe(5);
	});

	it('should recompute when a source state changes', () => {
		// Prepare
		const $left = createState(2);
		const $right = createState(3);
		const $sum = createComputedState([$left, $right], ([left, right]) => left + right);

		// Act
		$left.set(5);

		// Assert
		expect($sum.get()).toBe(8);
	});

	it('should update before later source listeners run', () => {
		// Prepare
		const $count = createState(1);
		const $double = createComputedState([$count], ([count]) => count * 2);
		const listener = vi.fn();

		$count.listen(
			({ value }) => {
				listener({ sourceValue: value, computedValue: $double.get() });
			},
			{ priority: EStateListenerQueuePriority.DEFAULT }
		);

		// Act
		$count.set(4);

		// Assert
		expect(listener).toHaveBeenCalledWith({ sourceValue: 4, computedValue: 8 });
	});

	it('should not notify listeners when the computed value stays equal', () => {
		// Prepare
		const $count = createState(1);
		const $parity = createComputedState([$count], ([count]) => count % 2);
		const listener = vi.fn();
		$parity.listen(listener);

		// Act
		$count.set(3);

		// Assert
		expect($parity.get()).toBe(1);
		expect(listener).not.toHaveBeenCalled();
	});

	it('should forward additional listener context from the source state', () => {
		// Prepare
		const $source = createState({ count: 1 });
		const $double = createComputedState([$source], ([source]) => source.count * 2);
		const listener = vi.fn();
		$double.listen(listener);

		// Act
		$source.set(
			{ count: 2 },
			{
				listenerContext: {
					background: true
				}
			}
		);

		// Assert
		expect(listener).toHaveBeenCalledWith(
			expect.objectContaining({
				background: true,
				value: 4,
				prevValue: 2
			})
		);
	});

	it('should stop reacting after destroy is called', () => {
		// Prepare
		const $count = createState(1);
		const $double = createComputedState([$count], ([count]) => count * 2);

		// Act
		$double.destroy();
		$count.set(2);

		// Assert
		expect($double.get()).toBe(2);
	});
});
