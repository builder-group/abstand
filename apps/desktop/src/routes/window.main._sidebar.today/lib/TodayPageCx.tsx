import { createState } from 'feature-state';
import React from 'react';
import { specta } from '@/environment';
import { createMountLifecycle, toTuple } from '@/lib';

export class TodayPageCx {
	public readonly $todayOverview = createState<specta.TodayIntentionOverviewDto | null>(null);
	public readonly $baseDate = createState(new Date());
	public readonly $hasLoaded = createState(false);

	public mount(): () => void {
		const lifecycle = createMountLifecycle();

		const baseDateIntervalId = window.setInterval(() => {
			this.$baseDate.set(new Date());
		}, baseDateRefreshIntervalMs);
		lifecycle.addCleanup(() => {
			window.clearInterval(baseDateIntervalId);
		});

		void (async () => {
			await this._refreshTodayOverview(() => lifecycle.isUnmounted());
			if (lifecycle.isUnmounted()) return;
			this.$hasLoaded.set(true);

			const refreshTodayOverview = () => {
				void this._refreshTodayOverview(() => lifecycle.isUnmounted());
			};

			lifecycle.addCleanup(await specta.events.intentionCreatedEvent.listen(refreshTodayOverview));

			if (lifecycle.isUnmounted()) return;

			lifecycle.addCleanup(await specta.events.intentionUpdatedEvent.listen(refreshTodayOverview));

			if (lifecycle.isUnmounted()) return;

			lifecycle.addCleanup(await specta.events.intentionDeletedEvent.listen(refreshTodayOverview));

			if (lifecycle.isUnmounted()) return;

			lifecycle.addCleanup(
				await specta.events.intentionSessionStartedEvent.listen(refreshTodayOverview)
			);

			if (lifecycle.isUnmounted()) return;

			lifecycle.addCleanup(
				await specta.events.intentionSessionCompletedEvent.listen(refreshTodayOverview)
			);

			if (lifecycle.isUnmounted()) return;

			lifecycle.addCleanup(
				await specta.events.intentionSessionStoppedEvent.listen(refreshTodayOverview)
			);
		})();

		return lifecycle.unmount;
	}

	private async _refreshTodayOverview(isStale: () => boolean = () => false): Promise<void> {
		const [isOk, , overview] = toTuple(await specta.commands.getTodayIntentionOverview());
		if (isStale()) {
			return;
		}
		if (isOk) {
			this.$todayOverview.set(overview);
		}
	}
}

const baseDateRefreshIntervalMs = 5 * 60_000;

export function useCreateTodayPageCx(): TodayPageCx {
	const cx = React.useMemo(() => new TodayPageCx(), []);

	React.useEffect(() => {
		return cx.mount();
	}, [cx]);

	return cx;
}
