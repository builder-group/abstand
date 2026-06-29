import { createFileRoute } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { ContentPage, Spinner } from '@/components';
import {
	ActiveIntentionsSection,
	EarlierIntentionsSection,
	UpcomingIntentionsSection
} from './components';
import { useCreateTodayPageCx } from './lib';

export const Route = createFileRoute('/window/main/_sidebar/today/')({
	component: RouteComponent
});

function RouteComponent() {
	const cx = useCreateTodayPageCx();
	const baseDate = useFeatureState(cx.$baseDate);
	const todayHeader = React.useMemo(() => createTodayHeaderContent(baseDate), [baseDate]);
	const hasTodayOverviewLoaded = useFeatureState(cx.$hasLoaded);

	const collapsedHeader = (
		<span className="text-base-950 block truncate text-sm font-semibold">
			{todayHeader.collapsedTitle}
		</span>
	);

	if (!hasTodayOverviewLoaded) {
		return (
			<ContentPage
				title={todayHeader.title}
				subtitle={todayHeader.subtitle}
				collapsedHeader={collapsedHeader}
				contentClassName="flex h-full flex-col"
			>
				<div className="flex flex-1 items-center justify-center">
					<Spinner size="md" />
				</div>
			</ContentPage>
		);
	}

	return (
		<ContentPage
			title={todayHeader.title}
			subtitle={todayHeader.subtitle}
			collapsedHeader={collapsedHeader}
		>
			<div className="space-y-5">
				<ActiveIntentionsSection cx={cx} />
				<UpcomingIntentionsSection cx={cx} />
				<EarlierIntentionsSection cx={cx} />
			</div>
		</ContentPage>
	);
}

function createTodayHeaderContent(date: Date): TTodayHeader {
	const dateLabel = new Intl.DateTimeFormat('en-US', {
		weekday: 'long',
		month: 'long',
		day: 'numeric'
	}).format(date);

	return {
		title: 'Welcome back.',
		subtitle: `It's ${dateLabel}.`,
		collapsedTitle: dateLabel
	};
}

interface TTodayHeader {
	title: string;
	subtitle: string;
	collapsedTitle: string;
}
