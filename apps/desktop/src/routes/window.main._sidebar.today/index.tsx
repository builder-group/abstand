import { createFileRoute } from '@tanstack/react-router';
import React from 'react';
import { ContentPage } from '@/components';
import {
	ActiveIntentionsSection,
	EarlierIntentionsSection,
	UpcomingIntentionsSection
} from './components';
import { useTodayHeader } from './hooks';
import { useCreateTodayPageCx } from './lib';

export const Route = createFileRoute('/window/main/_sidebar/today/')({
	component: RouteComponent
});

function RouteComponent() {
	const todayHeader = useTodayHeader();
	const cx = useCreateTodayPageCx();

	return (
		<ContentPage title={todayHeader.todayLabel} subtitle={todayHeader.greeting}>
			<div className="space-y-5">
				<ActiveIntentionsSection cx={cx} />
				<UpcomingIntentionsSection cx={cx} />
				<EarlierIntentionsSection cx={cx} />
			</div>
		</ContentPage>
	);
}
