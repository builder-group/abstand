import { useCompute } from 'feature-react/state';
import React from 'react';
import { ChevronDownIcon, CircleCheckIcon } from '@/components';
import { type specta } from '@/environment';
import { formatDisplayTime } from '@/lib';
import { SettingsRowFrame } from '@/modules/settings';
import { type TodayPageCx } from '../lib';
import { TodayIntentionRow } from './TodayIntentionRow';
import { SectionIndicator, TodaySection } from './TodaySection';

export const EarlierIntentionsSection: React.FC<TEarlierIntentionsSectionProps> = (props) => {
	const { cx } = props;
	const earlierIntentions = useCompute(cx.$todayOverview, (todayOverview) => {
		return todayOverview?.earlierToday ?? [];
	});

	const [isExpanded, setIsExpanded] = React.useState(false);
	const visibleEarlierIntentions = isExpanded
		? earlierIntentions
		: earlierIntentions.slice(0, EARLIER_INTENTION_PREVIEW_COUNT);
	const remainingIntentionCount = Math.max(
		earlierIntentions.length - EARLIER_INTENTION_PREVIEW_COUNT,
		0
	);

	// MARK: - Actions

	const handleExpandedToggle = React.useCallback(() => {
		setIsExpanded((currentIsExpanded) => !currentIsExpanded);
	}, []);

	// MARK: - UI

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
			{visibleEarlierIntentions.map((earlierIntention) => (
				<EarlierIntentionRow
					key={earlierIntention.session.id}
					earlierIntention={earlierIntention}
				/>
			))}
			{remainingIntentionCount > 0 && (
				<EarlierIntentionsToggleRow
					isExpanded={isExpanded}
					remainingIntentionCount={remainingIntentionCount}
					onToggle={handleExpandedToggle}
				/>
			)}
		</TodaySection>
	);
};

interface TEarlierIntentionsSectionProps {
	cx: TodayPageCx;
}

const EARLIER_INTENTION_PREVIEW_COUNT = 5;

const EarlierIntentionRow: React.FC<TEarlierIntentionRowProps> = (props) => {
	const { earlierIntention } = props;
	const { intention, session } = earlierIntention;

	return <TodayIntentionRow intention={intention} description={formatEarlierTimeLabel(session)} />;
};

interface TEarlierIntentionRowProps {
	earlierIntention: specta.TodayEarlierIntention;
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

const EarlierIntentionsToggleRow: React.FC<TEarlierIntentionsToggleRowProps> = (props) => {
	const { isExpanded, remainingIntentionCount, onToggle } = props;

	return (
		<SettingsRowFrame
			render={<button type="button" aria-expanded={isExpanded} onClick={onToggle} />}
			variant="compact"
			className="text-base-500 hover:text-base-950 justify-center gap-1.5"
		>
			<span className="text-xs font-medium">
				{isExpanded ? 'Show fewer' : `Show ${remainingIntentionCount} more`}
			</span>
			<ChevronDownIcon aria-hidden className={isExpanded ? 'size-3.5 rotate-180' : 'size-3.5'} />
		</SettingsRowFrame>
	);
};

interface TEarlierIntentionsToggleRowProps {
	isExpanded: boolean;
	remainingIntentionCount: number;
	onToggle: () => void;
}
