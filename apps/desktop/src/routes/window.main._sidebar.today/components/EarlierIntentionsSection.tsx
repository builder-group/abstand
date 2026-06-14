import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { CircleCheckIcon } from '@/components';
import { type specta } from '@/environment';
import { formatDisplayTime } from '@/lib';
import { type TodayPageCx } from '../lib';
import { TodayIntentionRow } from './TodayIntentionRow';
import { SectionIndicator, TodaySection } from './TodaySection';

export const EarlierIntentionsSection: React.FC<TEarlierIntentionsSectionProps> = (props) => {
	const { cx } = props;
	const todayOverview = useFeatureState(cx.$todayOverview);
	const earlierIntentions = todayOverview?.earlierToday ?? [];

	if (!earlierIntentions.length) {
		return null;
	}

	return (
		<TodaySection
			title="Earlier today"
			indicator={
				<SectionIndicator className="bg-secondary/10 text-secondary">
					<CircleCheckIcon />
				</SectionIndicator>
			}
		>
			{earlierIntentions.map((earlierIntention) => (
				<EarlierIntentionRow
					key={earlierIntention.session.id}
					earlierIntention={earlierIntention}
				/>
			))}
		</TodaySection>
	);
};

interface TEarlierIntentionsSectionProps {
	cx: TodayPageCx;
}

const EarlierIntentionRow: React.FC<TEarlierIntentionRowProps> = (props) => {
	const { earlierIntention } = props;
	const { intention, session } = earlierIntention;

	return <TodayIntentionRow intention={intention} description={formatEarlierTimeLabel(session)} />;
};

interface TEarlierIntentionRowProps {
	earlierIntention: specta.TodayEarlierIntentionDto;
}

function formatEarlierTimeLabel(session: specta.IntentionSession): string {
	if (session.endedAt == null) {
		return session.status === 'stopped' ? 'Ended early today' : 'Completed today';
	}

	const timeRangeLabel = `${formatDisplayTime(new Date(session.startedAt))}-${formatDisplayTime(
		new Date(session.endedAt)
	)}`;
	if (session.status === 'stopped') {
		return `Ended early ${timeRangeLabel}`;
	}

	return `Completed ${timeRangeLabel}`;
}
