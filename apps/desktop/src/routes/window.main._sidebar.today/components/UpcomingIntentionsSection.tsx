import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { ClockIcon } from '@/components';
import { type specta } from '@/environment';
import { formatDisplayTime } from '@/lib';
import { formatIntentionBehavior } from '@/modules/intentions';
import { type TodayPageCx } from '../lib';
import { TodayIntentionRow } from './TodayIntentionRow';
import { SectionIndicator, TodaySection } from './TodaySection';

export const UpcomingIntentionsSection: React.FC<TUpcomingIntentionsSectionProps> = (props) => {
	const { cx } = props;
	const todayOverview = useFeatureState(cx.$todayOverview);
	const upcomingIntentions = todayOverview?.upcomingToday ?? [];

	if (!upcomingIntentions.length) {
		return null;
	}

	return (
		<TodaySection
			title="Upcoming today"
			indicator={
				<SectionIndicator className="bg-warning/10 text-warning">
					<ClockIcon />
				</SectionIndicator>
			}
		>
			{upcomingIntentions.map((upcomingIntention) => (
				<UpcomingIntentionRow
					key={upcomingIntention.intention.id}
					upcomingIntention={upcomingIntention}
				/>
			))}
		</TodaySection>
	);
};

interface TUpcomingIntentionsSectionProps {
	cx: TodayPageCx;
}

const UpcomingIntentionRow: React.FC<TUpcomingIntentionRowProps> = (props) => {
	const { upcomingIntention } = props;
	const { intention, triggerAt } = upcomingIntention;

	return (
		<TodayIntentionRow
			intention={intention}
			description={[
				`Starts at ${formatDisplayTime(new Date(triggerAt))}`,
				formatIntentionBehavior(intention)
			].join(' · ')}
		/>
	);
};

interface TUpcomingIntentionRowProps {
	upcomingIntention: specta.TodayUpcomingIntentionDto;
}
