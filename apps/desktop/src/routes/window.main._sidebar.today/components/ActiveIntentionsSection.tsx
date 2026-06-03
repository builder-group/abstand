import { Link } from '@tanstack/react-router';
import { useCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import { MoonIcon, ShieldIcon } from '@/components';
import { type specta } from '@/environment';
import { formatCompactDuration, formatDisplayTime, formatDisplayTimeOfDay } from '@/lib';
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
					{[formatIntentionBehavior(intention), formatEndConditions(intention.conditions)].join(
						' · '
					)}
				</span>
			</div>
			<span className="text-base-500 shrink-0 text-xs tabular-nums">
				{`${formatDisplayTime(new Date(session.startedAt))} to ${formatEndTime(
					automaticEndAt,
					intention.conditions
				)}`}
			</span>
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
					<MoonIcon className="size-3.5" />
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

function formatEndConditions(conditions: specta.IntentionCondition[]): string {
	const endConditions = conditions.filter((condition) => condition.transition === 'end');
	if (!endConditions.length) {
		return 'Manual end';
	}

	const labels = endConditions.map((condition) => formatEndCondition(condition));
	return labels.join(' or ');
}

function formatEndCondition(condition: specta.IntentionCondition): string {
	switch (condition.rule.type) {
		case 'manual':
			return 'Manual end';
		case 'afterTransition':
			return `Ends after ${formatCompactDuration(condition.rule.offsetMs)}`;
		case 'dateTime':
			return `Ends at ${formatDisplayTime(new Date(condition.rule.triggerAt))}`;
		case 'schedule':
			return `Ends at ${formatDisplayTimeOfDay(condition.rule.timeOfDayMs)}`;
	}
}

function formatEndTime(
	automaticEndAt: number | null,
	conditions: specta.IntentionCondition[]
): string {
	if (automaticEndAt != null) {
		return formatDisplayTime(new Date(automaticEndAt));
	}

	const hasAutomaticEnd = conditions.some(
		(condition) => condition.transition === 'end' && condition.rule.type !== 'manual'
	);
	if (hasAutomaticEnd) {
		return 'Automatic';
	}

	const hasManualEnd = conditions.some(
		(condition) => condition.transition === 'end' && condition.rule.type === 'manual'
	);
	return hasManualEnd ? 'Manual' : 'Open';
}
