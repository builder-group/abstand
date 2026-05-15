import { createState, type TState } from 'feature-state';
import React from 'react';
import { type TResult } from 'tuple-result';
import { specta } from '@/environment';
import { createMountLifecycle, toTuple } from '@/lib';

export class IntentionsCx {
	public readonly intentions: Record<number, TState<specta.Intention, []>> = {};
	public readonly $intentionIds = createState<number[]>([]);

	public readonly activeSessions: Record<number, TState<specta.IntentionSession, []>> = {};
	public readonly $activeIntentionIds = createState<number[]>([]);

	public readonly $hasLoaded = createState(false);

	public mount(): () => void {
		const lifecycle = createMountLifecycle();

		void (async () => {
			const [intentionsResult, activeSessionsResult] = await Promise.all([
				specta.commands.getIntentions(),
				specta.commands.getActiveIntentionSessions()
			]);
			if (lifecycle.isUnmounted()) return;
			const [areIntentionsOk, , intentions] = toTuple(intentionsResult);
			if (areIntentionsOk) {
				for (const intention of intentions) {
					this._upsertIntention(intention);
				}
			}
			const [areActiveSessionsOk, , activeSessions] = toTuple(activeSessionsResult);
			if (areActiveSessionsOk) {
				for (const session of activeSessions) {
					this._upsertActiveSession(session);
				}
			}
			this.$hasLoaded.set(true);

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

			if (lifecycle.isUnmounted()) return;

			lifecycle.addCleanup(
				await specta.events.intentionDeletedEvent.listen(({ payload }) => {
					this._removeIntention(payload.intentionId);
					this._removeActiveSession(payload.intentionId);
				})
			);

			if (lifecycle.isUnmounted()) return;

			lifecycle.addCleanup(
				await specta.events.intentionSessionStartedEvent.listen(async ({ payload }) => {
					const [isOk, , activeSession] = toTuple(
						await specta.commands.getActiveIntentionSession(payload.intentionId)
					);
					if (lifecycle.isUnmounted()) return;
					if (!isOk) return;

					if (activeSession != null) {
						this._upsertActiveSession(activeSession);
					} else {
						this._removeActiveSession(payload.intentionId);
					}
				})
			);

			if (lifecycle.isUnmounted()) return;

			lifecycle.addCleanup(
				await specta.events.intentionSessionCompletedEvent.listen(({ payload }) => {
					this._removeActiveSession(payload.intentionId);
				})
			);

			if (lifecycle.isUnmounted()) return;

			lifecycle.addCleanup(
				await specta.events.intentionSessionStoppedEvent.listen(({ payload }) => {
					this._removeActiveSession(payload.intentionId);
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

	public async start(intentionId: number): Promise<TResult<specta.IntentionSession, string>> {
		const result = toTuple(await specta.commands.startIntention(intentionId));
		const [isOk, , session] = result;
		if (isOk) {
			this._upsertActiveSession(session);
		}
		return result;
	}

	private _upsertIntention(intention: specta.Intention): void {
		if (this.intentions[intention.id] != null) {
			this.intentions[intention.id]?.set(intention);
		} else {
			this.intentions[intention.id] = createState(intention);
			this.$intentionIds.set([...this.$intentionIds.get(), intention.id]);
		}
	}

	private _removeIntention(intentionId: number): void {
		if (this.intentions[intentionId] == null) {
			return;
		}

		delete this.intentions[intentionId];
		this.$intentionIds.set(this.$intentionIds.get().filter((id) => id !== intentionId));
	}

	private _upsertActiveSession(session: specta.IntentionSession): void {
		if (this.activeSessions[session.intentionId] != null) {
			this.activeSessions[session.intentionId]?.set(session);
		} else {
			this.activeSessions[session.intentionId] = createState(session);
			this.$activeIntentionIds.set([...this.$activeIntentionIds.get(), session.intentionId]);
		}
	}

	private _removeActiveSession(intentionId: number): void {
		if (this.activeSessions[intentionId] == null) {
			return;
		}

		delete this.activeSessions[intentionId];
		this.$activeIntentionIds.set(this.$activeIntentionIds.get().filter((id) => id !== intentionId));
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
