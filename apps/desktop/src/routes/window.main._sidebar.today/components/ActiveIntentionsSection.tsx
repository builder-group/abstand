import { useCompute } from 'feature-react/state';
import React from 'react';
import { type specta } from '@/environment';
import { cn, formatActiveTimeRangeLabel } from '@/lib';
import { formatIntentionBehavior } from '@/modules/intentions';
import { type TodayPageCx } from '../lib';
import { TodayIntentionRow } from './TodayIntentionRow';
import { SectionIndicator, TodayEmptyRow, TodaySection } from './TodaySection';

export const ActiveIntentionsSection: React.FC<TActiveIntentionsSectionProps> = (props) => {
	const { cx } = props;
	const activeIntentions = useCompute(cx.$todayOverview, (todayOverview) => {
		return todayOverview?.active ?? [];
	});

	if (!activeIntentions.length) {
		return (
			<TodaySection
				title="Active now"
				contentLayout="placeholder"
				indicator={<ActiveSectionIndicator isActive={false} />}
			>
				<TodayEmptyRow
					title="No active Intention"
					description="Start an Intention or schedule one for later today."
				/>
			</TodaySection>
		);
	}

	return (
		<TodaySection title="Active now" indicator={<ActiveSectionIndicator isActive />}>
			{activeIntentions.map((activeIntention) => (
				<ActiveIntentionRow key={activeIntention.session.id} activeIntention={activeIntention} />
			))}
		</TodaySection>
	);
};

interface TActiveIntentionsSectionProps {
	cx: TodayPageCx;
}

const ActiveSectionIndicator: React.FC<TActiveSectionIndicatorProps> = (props) => {
	const { isActive } = props;

	return (
		<SectionIndicator
			className={cn(
				'bg-success/10',
				isActive &&
					"before:bg-success/20 before:absolute before:inset-0 before:animate-ping before:rounded-full before:content-['']"
			)}
		>
			<span className="bg-success size-2 rounded-full" />
		</SectionIndicator>
	);
};

interface TActiveSectionIndicatorProps {
	isActive: boolean;
}

const ActiveIntentionRow: React.FC<TActiveIntentionRowProps> = (props) => {
	const { activeIntention } = props;
	const { intention, session, automaticEndAt } = activeIntention;

	return (
		<TodayIntentionRow
			intention={intention}
			description={[
				formatActiveTimeRangeLabel({
					startedAt: session.startedAt,
					endsAt: automaticEndAt
				}),
				formatIntentionBehavior(intention)
			].join(' · ')}
		/>
	);
};

interface TActiveIntentionRowProps {
	activeIntention: specta.TodayActiveIntention;
}
