import { createFileRoute } from '@tanstack/react-router';
import React from 'react';
import { ClockIcon, ContentPage } from '@/components';
import {
	ActiveIntentionsSection,
	EarlierIntentionsSection,
	SectionIndicator,
	TodayEmptyRow,
	TodaySection
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
				<UpcomingIntentionsSection />
				<EarlierIntentionsSection cx={cx} />
			</div>
		</ContentPage>
	);
}

const UpcomingIntentionsSection: React.FC = () => {
	return (
		<TodaySection
			title="Upcoming today"
			contentLayout="placeholder"
			indicator={
				<SectionIndicator className="bg-warning/10 text-warning">
					<ClockIcon />
				</SectionIndicator>
			}
		>
			<TodayEmptyRow
				title="Nothing scheduled later today"
				description="Intentions scheduled for later today will appear here."
			/>
		</TodaySection>
	);
};
