import { createState, type TState } from 'feature-state';
import React from 'react';
import { type TResult } from 'tuple-result';
import { specta } from '@/environment';
import { createMountLifecycle, toTuple } from '@/lib';

export class IntentionsCx {
	private readonly _intentions: Record<number, TState<specta.Intention | null, []>> = {};
	public readonly $intentionIds = createState<number[]>([]);

	private readonly _activeSessions: Record<number, TState<specta.IntentionSession | null, []>> = {};
	public readonly $activeIntentionIds = createState<number[]>([]);
	public readonly $hasActiveStrictBlockSession = createState(false);
	public readonly $hasActiveBalancedBlockSession = createState(false);

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

	public getIntention(intentionId: number): specta.Intention | null {
		return this.getIntentionState(intentionId).get();
	}

	// Note: Keep intention states stable so callers can subscribe before the record exists;
	// direct map reads can return undefined, which feature-react cannot observe later
	public getIntentionState(intentionId: number): TState<specta.Intention | null, []> {
		let $intention = this._intentions[intentionId];
		if ($intention == null) {
			$intention = createState<specta.Intention | null>(null);
			this._intentions[intentionId] = $intention;
		}
		return $intention;
	}

	// Note: Keep active session states stable so callers can subscribe before the record exists;
	// direct map reads can return undefined, which feature-react cannot observe later
	public getActiveSessionState(intentionId: number): TState<specta.IntentionSession | null, []> {
		let $activeSession = this._activeSessions[intentionId];
		if ($activeSession == null) {
			$activeSession = createState<specta.IntentionSession | null>(null);
			this._activeSessions[intentionId] = $activeSession;
		}
		return $activeSession;
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

	public async update(
		params: specta.UpdateIntentionParams
	): Promise<TResult<specta.Intention, string>> {
		const result = toTuple(await specta.commands.updateIntention(params));
		const [isOk, , intention] = result;
		if (isOk) {
			this._upsertIntention(intention);
		}
		return result;
	}

	public async pause(intentionId: number): Promise<TResult<specta.Intention, string>> {
		const result = toTuple(await specta.commands.pauseIntention(intentionId));
		const [isOk, , intention] = result;
		if (isOk) {
			this._upsertIntention(intention);
		}
		return result;
	}

	public async resume(intentionId: number): Promise<TResult<specta.Intention, string>> {
		const result = toTuple(await specta.commands.resumeIntention(intentionId));
		const [isOk, , intention] = result;
		if (isOk) {
			this._upsertIntention(intention);
		}
		return result;
	}

	public async assessEditPolicy(
		params: specta.UpdateIntentionParams
	): Promise<TResult<specta.IntentionEditPolicyAssessment | null, string>> {
		return toTuple(await specta.commands.assessIntentionEditPolicy(params));
	}

	public async start(intentionId: number): Promise<TResult<specta.IntentionSession, string>> {
		const result = toTuple(await specta.commands.startIntention(intentionId));
		const [isOk, , session] = result;
		if (isOk) {
			this._upsertActiveSession(session);
		}
		return result;
	}

	public async complete(
		intentionId: number,
		endConditionId: number | null
	): Promise<TResult<specta.IntentionSession, string>> {
		const result = toTuple(await specta.commands.completeIntention(intentionId, endConditionId));
		const [isOk] = result;
		if (isOk) {
			this._removeActiveSession(intentionId);
		}
		return result;
	}

	public async stop(intentionId: number): Promise<TResult<specta.IntentionSession, string>> {
		const result = toTuple(await specta.commands.stopIntention(intentionId));
		const [isOk] = result;
		if (isOk) {
			this._removeActiveSession(intentionId);
		}
		return result;
	}

	public async deleteIntention(intentionId: number): Promise<TResult<null, string>> {
		const result = toTuple(await specta.commands.deleteIntention(intentionId));
		const [isOk] = result;
		if (isOk) {
			this._removeIntention(intentionId);
			this._removeActiveSession(intentionId);
		}
		return result;
	}

	private _upsertIntention(intention: specta.Intention): void {
		this.getIntentionState(intention.id).set(intention);

		const intentionIds = this.$intentionIds.get();
		if (!intentionIds.includes(intention.id)) {
			this.$intentionIds.set([...intentionIds, intention.id]);
		}

		this._syncActiveBlockEnforcement();
	}

	private _removeIntention(intentionId: number): void {
		const $intention = this._intentions[intentionId];
		if ($intention != null) {
			$intention.set(null);
		}

		const intentionIds = this.$intentionIds.get();
		if (intentionIds.includes(intentionId)) {
			this.$intentionIds.set(intentionIds.filter((id) => id !== intentionId));
		}

		this._syncActiveBlockEnforcement();
	}

	private _upsertActiveSession(session: specta.IntentionSession): void {
		this.getActiveSessionState(session.intentionId).set(session);

		const activeIntentionIds = this.$activeIntentionIds.get();
		if (!activeIntentionIds.includes(session.intentionId)) {
			this.$activeIntentionIds.set([...activeIntentionIds, session.intentionId]);
		}

		this._syncActiveBlockEnforcement();
	}

	private _removeActiveSession(intentionId: number): void {
		const $activeSession = this._activeSessions[intentionId];
		if ($activeSession != null) {
			$activeSession.set(null);
		}

		const activeIntentionIds = this.$activeIntentionIds.get();
		if (activeIntentionIds.includes(intentionId)) {
			this.$activeIntentionIds.set(activeIntentionIds.filter((id) => id !== intentionId));
		}

		this._syncActiveBlockEnforcement();
	}

	private _syncActiveBlockEnforcement(): void {
		let hasActiveStrictBlockSession = false;
		let hasActiveBalancedBlockSession = false;

		for (const intentionId of this.$activeIntentionIds.get()) {
			const intention = this._intentions[intentionId]?.get();
			if (intention?.behavior.type !== 'block') {
				continue;
			}

			if (intention.behavior.enforcementMode === 'strict') {
				hasActiveStrictBlockSession = true;
			}
			if (intention.behavior.enforcementMode === 'balanced') {
				hasActiveBalancedBlockSession = true;
			}
		}

		this.$hasActiveStrictBlockSession.set(hasActiveStrictBlockSession);
		this.$hasActiveBalancedBlockSession.set(hasActiveBalancedBlockSession);
	}
}

// MARK: - React Context

const ReactIntentionsContext = React.createContext<IntentionsCx | null>(null);

export const IntentionsCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const cx = React.useMemo(() => new IntentionsCx(), []);

	React.useEffect(() => {
		return cx.mount();
	}, [cx]);

	return <ReactIntentionsContext value={cx}>{children}</ReactIntentionsContext>;
};

export function useIntentionsCx(): IntentionsCx {
	const cx = React.use(ReactIntentionsContext);
	if (cx == null) {
		throw new Error('useIntentionsCx must be used within an IntentionsCxProvider');
	}
	return cx;
}
