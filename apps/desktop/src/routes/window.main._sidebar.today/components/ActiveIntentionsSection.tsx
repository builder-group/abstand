import { Link } from '@tanstack/react-router';
import { useCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import { MonitorPauseIcon, ShieldIcon } from '@/components';
import { type specta } from '@/environment';
import { formatActiveTimeRangeLabel } from '@/lib';
import { type TBlockIntention } from '@/modules/intentions';
import { SettingsRowFrame } from '@/modules/settings';
import { type TodayPageCx } from '../lib';
import { SectionIndicator, TodayEmptyRow, TodayLoadingRow, TodaySection } from './TodaySection';

export const ActiveIntentionsSection: React.FC<TActiveIntentionsSectionProps> = (props) => {
	const { cx } = props;
	const todayOverview = useFeatureState(cx.$todayOverview);
	const isTodayOverviewLoading = useCompute(cx.$hasLoaded, (value) => !value);
	const activeIntentions = todayOverview?.active ?? [];

	if (activeIntentions.length > 0) {
		return (
			<TodaySection title="Active now" indicator={<ActiveSectionIndicator />}>
				{activeIntentions.map((activeIntention) => (
					<ActiveIntentionRow key={activeIntention.session.id} activeIntention={activeIntention} />
				))}
			</TodaySection>
		);
	}

	if (isTodayOverviewLoading) {
		return (
			<TodaySection
				title="Active now"
				contentLayout="placeholder"
				indicator={<ActiveSectionIndicator />}
			>
				<TodayLoadingRow title="Loading active intentions..." />
			</TodaySection>
		);
	}

	return (
		<TodaySection
			title="Active now"
			contentLayout="placeholder"
			indicator={<ActiveSectionIndicator />}
		>
			<TodayEmptyRow
				title="No active intentions"
				description="Intentions will appear here when they start."
			/>
		</TodaySection>
	);
};

interface TActiveIntentionsSectionProps {
	cx: TodayPageCx;
}

const ActiveSectionIndicator: React.FC = () => {
	return (
		<SectionIndicator className="bg-success/10 before:bg-success/20 before:absolute before:inset-0 before:animate-ping before:rounded-full before:content-['']">
			<span className="bg-success size-2 rounded-full" />
		</SectionIndicator>
	);
};

const ActiveIntentionRow: React.FC<TActiveIntentionRowProps> = (props) => {
	const { activeIntention } = props;
	const { intention, session, automaticEndAt } = activeIntention;

	return (
		<SettingsRowFrame
			render={
				<Link
					to="/window/main/intentions/$intentionId"
					params={{ intentionId: intention.id }}
					search={{ backTo: '/window/main/today' }}
				/>
			}
			variant="compact"
			className="gap-1.5"
		>
			<IntentionIcon intention={intention} />
			<div className="flex min-w-0 flex-1 flex-col">
				<span className="text-base-950 truncate text-sm">{intention.name}</span>
				<span className="text-base-400 truncate text-xs">
					{[
						formatActiveTimeRangeLabel({ startedAt: session.startedAt, endsAt: automaticEndAt }),
						formatIntentionBehavior(intention)
					].join(' · ')}
				</span>
			</div>
		</SettingsRowFrame>
	);
};

interface TActiveIntentionRowProps {
	activeIntention: specta.TodayActiveIntentionDto;
}

const IntentionIcon: React.FC<TIntentionIconProps> = (props) => {
	const { intention } = props;

	switch (intention.behavior.type) {
		case 'block':
			return (
				<span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
					<ShieldIcon className="size-3.5" />
				</span>
			);
		case 'break':
			return (
				<span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
					<MonitorPauseIcon className="size-3.5" />
				</span>
			);
	}
};

interface TIntentionIconProps {
	intention: specta.Intention;
}

function formatIntentionBehavior(intention: specta.Intention): string {
	switch (intention.behavior.type) {
		case 'block':
			return formatBlockScope(intention.behavior);
		case 'break':
			return 'Break';
	}
}

function formatBlockScope(block: TBlockIntention['behavior']): string {
	if (block.scope === 'wholeDevice') {
		return 'Whole device';
	}

	const targetLabel = formatTargetCounts(block.apps.length, block.websites.length);
	if (block.scope === 'allowTargets') {
		return `Allows ${targetLabel}`;
	}

	return `Blocks ${targetLabel}`;
}

function formatTargetCounts(appCount: number, websiteCount: number): string {
	const parts: string[] = [];
	if (appCount > 0) {
		parts.push(`${appCount} ${appCount === 1 ? 'app' : 'apps'}`);
	}
	if (websiteCount > 0) {
		parts.push(`${websiteCount} ${websiteCount === 1 ? 'website' : 'websites'}`);
	}

	return parts.length > 0 ? parts.join(', ') : 'no targets';
}
