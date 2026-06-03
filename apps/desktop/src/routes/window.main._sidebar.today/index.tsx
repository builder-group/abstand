import { createFileRoute } from '@tanstack/react-router';
import React from 'react';
import { CircleCheckIcon, ClockIcon, ContentPage } from '@/components';
import {
	ActiveIntentionsSection,
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
				<EarlierIntentionsSection />
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
				title="No upcoming intentions today"
				description="Intentions scheduled for later today will appear here."
			/>
		</TodaySection>
	);
};

const EarlierIntentionsSection: React.FC = () => {
	return (
		<TodaySection
			title="Earlier today"
			contentLayout="placeholder"
			indicator={
				<SectionIndicator className="bg-secondary/10 text-secondary">
					<CircleCheckIcon />
				</SectionIndicator>
			}
		>
			<TodayEmptyRow
				title="No earlier intentions today"
				description="Completed and stopped intentions from today will appear here."
			/>
		</TodaySection>
	);
};
