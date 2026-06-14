import { useCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import { ClockIcon } from '@/components';
import { type specta } from '@/environment';
import { formatDisplayTime } from '@/lib';
import { formatIntentionBehavior } from '@/modules/intentions';
import { type TodayPageCx } from '../lib';
import { TodayIntentionRow } from './TodayIntentionRow';
import { SectionIndicator, TodayEmptyRow, TodayLoadingRow, TodaySection } from './TodaySection';

export const UpcomingIntentionsSection: React.FC<TUpcomingIntentionsSectionProps> = (props) => {
	const { cx } = props;
	const todayOverview = useFeatureState(cx.$todayOverview);
	const isTodayOverviewLoading = useCompute(cx.$hasLoaded, (value) => !value);
	const upcomingIntentions = todayOverview?.upcomingToday ?? [];

	if (upcomingIntentions.length > 0) {
		return (
			<TodaySection title="Upcoming today" indicator={<UpcomingSectionIndicator />}>
				{upcomingIntentions.map((upcomingIntention) => (
					<UpcomingIntentionRow
						key={upcomingIntention.intention.id}
						upcomingIntention={upcomingIntention}
					/>
				))}
			</TodaySection>
		);
	}

	if (isTodayOverviewLoading) {
		return (
			<TodaySection
				title="Upcoming today"
				contentLayout="placeholder"
				indicator={<UpcomingSectionIndicator />}
			>
				<TodayLoadingRow title="Loading upcoming Intentions..." />
			</TodaySection>
		);
	}

	return (
		<TodaySection
			title="Upcoming today"
			contentLayout="placeholder"
			indicator={<UpcomingSectionIndicator />}
		>
			<TodayEmptyRow
				title="Nothing scheduled later today"
				description="Intentions scheduled for later today will appear here."
			/>
		</TodaySection>
	);
};

interface TUpcomingIntentionsSectionProps {
	cx: TodayPageCx;
}

const UpcomingSectionIndicator: React.FC = () => {
	return (
		<SectionIndicator className="bg-warning/10 text-warning">
			<ClockIcon />
		</SectionIndicator>
	);
};

const UpcomingIntentionRow: React.FC<TUpcomingIntentionRowProps> = (props) => {
	const { upcomingIntention } = props;
	const { intention, triggerAt } = upcomingIntention;

	return (
		<TodayIntentionRow
			intention={intention}
			description={[
				`Starts ${formatDisplayTime(new Date(triggerAt))}`,
				formatIntentionBehavior(intention)
			].join(' · ')}
		/>
	);
};

interface TUpcomingIntentionRowProps {
	upcomingIntention: specta.TodayUpcomingIntentionDto;
}
