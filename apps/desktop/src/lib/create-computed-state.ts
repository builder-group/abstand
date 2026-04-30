import { withNew } from '@blgc/utils';
import {
	createState,
	EStateListenerQueuePriority,
	type TAdditionalListenerContext,
	type TCreateStateOptions,
	type TState,
	type TStateValue
} from 'feature-state';

/** Creates a state whose value is derived from other states. */
export function createComputedState<
	GStates extends readonly [TState<any, any>, ...TState<any, any>[]],
	GValue
>(
	sourceStates: GStates,
	compute: (values: TComputedSourceValues<GStates>) => GValue,
	options: TCreateComputedStateOptions<GValue> = {}
): TComputedState<GStates, GValue> {
	const {
		isEqual = Object.is,
		key = 'computed_state',
		priority = EStateListenerQueuePriority.EARLY,
		queue
	} = options;

	return withNew<TComputedState<GStates, GValue>>(
		Object.assign(createState(compute(getSourceValues(sourceStates)), { queue }), {
			_sources: sourceStates,
			_cleanups: [],
			_new(this: TComputedState<GStates, GValue>) {
				this._cleanups = this._sources.map((sourceState, index) =>
					sourceState.listen(
						({ value: _, prevValue: __, ...listenerContext }) => {
							this.recompute(listenerContext as TAdditionalListenerContext<GValue>);
						},
						{
							key: `${key}-${index}`,
							priority
						}
					)
				);
			},
			destroy(this: TComputedState<GStates, GValue>) {
				while (this._cleanups.length > 0) {
					this._cleanups.pop()?.();
				}
			},
			recompute(
				this: TComputedState<GStates, GValue>,
				listenerContext: TAdditionalListenerContext<GValue> = {}
			) {
				const nextValue = compute(getSourceValues(this._sources));
				if (isEqual !== false && isEqual(nextValue, this._v)) {
					return;
				}

				listenerContext.source = listenerContext.source ?? key;
				this.set(nextValue, { listenerContext });
			}
		})
	);
}

interface TCreateComputedStateOptions<GValue> extends TCreateStateOptions {
	isEqual?: ((a: GValue, b: GValue) => boolean) | false;
	key?: string;
	priority?: number;
}

export interface TComputedState<
	GStates extends readonly [TState<any, any>, ...TState<any, any>[]],
	GValue
> extends TState<GValue, []> {
	_sources: GStates;
	_cleanups: Array<() => void>;
	destroy(): void;
	recompute(listenerContext?: TAdditionalListenerContext<GValue>): void;
}

function getSourceValues<GStates extends readonly TState<any, any>[]>(
	sourceStates: GStates
): TComputedSourceValues<GStates> {
	return sourceStates.map((sourceState) => sourceState._v) as TComputedSourceValues<GStates>;
}

type TComputedSourceValues<GStates extends readonly TState<any, any>[]> = {
	readonly [K in keyof GStates]: TStateValue<GStates[K]>;
};
