import { createState, type TState } from 'feature-state';
import React from 'react';
import { type TResult } from 'tuple-result';
import { specta } from '@/environment';
import { createMountLifecycle, toTuple } from '@/lib';

export class IntentionsCx {
	public readonly intentions: Record<number, TState<specta.Intention, []>> = {};
	public readonly $intentionIds = createState<number[]>([]);

	public mount(): () => void {
		const lifecycle = createMountLifecycle();

		void (async () => {
			const [areIntentionsOk, , intentions] = toTuple(await specta.commands.getIntentions());
			if (lifecycle.isUnmounted()) return;
			if (areIntentionsOk) {
				for (const intention of intentions) {
					this.intentions[intention.id] = createState(intention);
				}
				this.$intentionIds.set(intentions.map((i) => i.id));
			}

			lifecycle.addCleanup(
				await specta.events.intentionCreatedEvent.listen(async ({ payload }) => {
					const [isOk, , intention] = toTuple(
						await specta.commands.getIntention(payload.intentionId)
					);
					if (lifecycle.isUnmounted()) return;
					if (isOk && intention != null) {
						this._upsertIntention(intention);
					}
				})
			);

			if (lifecycle.isUnmounted()) return;

			lifecycle.addCleanup(
				await specta.events.intentionUpdatedEvent.listen(async ({ payload }) => {
					const [isOk, , intention] = toTuple(
						await specta.commands.getIntention(payload.intentionId)
					);
					if (lifecycle.isUnmounted()) return;
					if (isOk && intention != null) {
						this._upsertIntention(intention);
					}
				})
			);
		})();

		return lifecycle.unmount;
	}

	public async create(
		params: specta.CreateIntentionParams
	): Promise<TResult<specta.Intention, string>> {
		const result = toTuple(await specta.commands.createIntention(params));
		const [isOk, , intention] = result;
		if (isOk) {
			this._upsertIntention(intention);
		}
		return result;
	}

	private _upsertIntention(intention: specta.Intention): void {
		if (this.intentions[intention.id] != null) {
			this.intentions[intention.id]?.set(intention);
		} else {
			this.intentions[intention.id] = createState(intention);
			this.$intentionIds.set([...this.$intentionIds._v, intention.id]);
		}
	}
}

const ReactIntentionsCx = React.createContext<IntentionsCx | null>(null);

export const IntentionsCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const cx = React.useMemo(() => new IntentionsCx(), []);

	React.useEffect(() => {
		return cx.mount();
	}, [cx]);

	return <ReactIntentionsCx.Provider value={cx}>{children}</ReactIntentionsCx.Provider>;
};

export function useIntentionsCx(): IntentionsCx {
	const cx = React.useContext(ReactIntentionsCx);
	if (cx == null) {
		throw new Error('useIntentionsCx must be used within an IntentionsCxProvider');
	}
	return cx;
}
