import { Link } from '@tanstack/react-router';
import { useCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import {
	Button,
	PauseIcon,
	PlusIcon,
	SearchIcon,
	SettingsIcon,
	ShieldIcon,
	Spinner,
	SunIcon,
	TimerIcon,
	Tooltip,
	WindowHeaderRow
} from '@/components';
import { specta } from '@/environment';
import { cn } from '@/lib';
import { useCommandPaletteCx } from '@/modules/command-palette';
import { useIntentionsCx } from '@/modules/intentions';
import { useShortcutHint } from '@/modules/shortcuts';
import { SidebarItem } from './SidebarItem';

export const MainSidebarContent: React.FC<TMainSidebarContentProps> = (props) => {
	const { className } = props;
	const commandPaletteCx = useCommandPaletteCx();
	const searchHint = useShortcutHint('search');
	const newIntentionHint = useShortcutHint('newIntention');
	const intentionsCx = useIntentionsCx();
	const intentionIds = useFeatureState(intentionsCx.$intentionIds);
	const areIntentionsLoading = useCompute(intentionsCx.$hasLoaded, (value) => !value);

	return (
		<div className={cn('flex h-full flex-col', className)}>
			<WindowHeaderRow />

			{/* Top nav */}
			<div className="border-base-100/80 flex flex-col gap-0.5 border-b px-2 py-2">
				<SidebarItem icon={<SunIcon />} label="Today" render={<Link to="/window/main/today" />} />
				<SidebarItem
					icon={<PlusIcon />}
					label="New Intention"
					shortcut={newIntentionHint}
					render={<Link to="/window/main/intentions/new" />}
					isAction
				/>
				<SidebarItem
					icon={<SearchIcon />}
					label="Search"
					shortcut={searchHint}
					isAction
					onClick={() => commandPaletteCx.open()}
				/>
			</div>

			{/* Intentions */}
			<div className="flex flex-1 flex-col overflow-y-auto px-2 py-3">
				<div className="group/intentions-heading flex items-center gap-1 px-2">
					<span className="text-base-500 min-w-0 flex-1 truncate text-sm font-light">
						Intentions
					</span>
					<Tooltip content="New Intention" shortcut={newIntentionHint}>
						<Button
							render={<Link to="/window/main/intentions/new" />}
							variant="ghost"
							size="icon-xs"
							className="opacity-0 group-focus-within/intentions-heading:opacity-100 group-hover/intentions-heading:opacity-100"
							aria-label="New Intention"
						>
							<PlusIcon />
						</Button>
					</Tooltip>
				</div>
				<div className="flex flex-col gap-0.5 py-1.5">
					{intentionIds.length > 0 ? (
						intentionIds.map((id) => <IntentionListItem key={id} id={id} />)
					) : areIntentionsLoading ? (
						<div className="text-base-400 flex items-center gap-1 px-2 py-1 text-sm">
							<Spinner />
							<span>Loading Intentions...</span>
						</div>
					) : (
						<p className="text-base-400 px-2 py-1 text-sm">
							No Intentions yet.{' '}
							<Link
								to="/window/main/intentions/new"
								className="text-primary rounded-xs underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
							>
								Create Intention
							</Link>
						</p>
					)}
				</div>
			</div>

			{/* Footer */}
			<div className="border-base-100/80 flex flex-col gap-0.5 border-t px-2 py-2">
				<SidebarItem
					icon={<SettingsIcon />}
					label="Settings"
					render={<Link to="/window/main/settings" />}
				/>
			</div>
		</div>
	);
};

interface TMainSidebarContentProps {
	className?: string;
}

// MARK: - IntentionListItem

const IntentionListItem: React.FC<TIntentionListItemProps> = (props) => {
	const { id } = props;
	const intentionsCx = useIntentionsCx();
	const intention = useFeatureState(intentionsCx.getIntentionState(id));
	const isActive = useCompute(
		intentionsCx.getActiveSessionState(id),
		(activeSession) => activeSession?.status === 'active'
	);
	const isPaused = intention?.pausedAt != null;

	if (intention == null) {
		return null;
	}

	return (
		<SidebarItem
			icon={<IntentionBehaviorIcon behavior={intention.behavior} />}
			label={intention.name}
			trailing={<IntentionStatusIndicators isPaused={isPaused} isActive={isActive} />}
			render={<Link to="/window/main/intentions/$intentionId" params={{ intentionId: id }} />}
		/>
	);
};

interface TIntentionListItemProps {
	id: number;
}

const IntentionStatusIndicators: React.FC<TIntentionStatusIndicatorsProps> = (props) => {
	const { isPaused, isActive } = props;

	if (!isPaused && !isActive) {
		return null;
	}

	return (
		<span className="flex shrink-0 items-center gap-0.5">
			{isPaused && (
				<span
					className="text-base-400 flex size-4 items-center justify-center"
					title="Paused Intention"
				>
					<PauseIcon className="size-3" />
					<span className="sr-only">Paused Intention</span>
				</span>
			)}
			{isActive && (
				<span className="flex size-4 items-center justify-center" title="Active Abstand">
					<span className="bg-success size-2 rounded-full" />
					<span className="sr-only">Active Abstand</span>
				</span>
			)}
		</span>
	);
};

interface TIntentionStatusIndicatorsProps {
	isPaused: boolean;
	isActive: boolean;
}

const IntentionBehaviorIcon: React.FC<TIntentionBehaviorIconProps> = (props) => {
	const { behavior } = props;

	switch (behavior.type) {
		case 'block':
			return <ShieldIcon className="text-base-400" />;
		case 'break':
			return <TimerIcon className="text-base-400" />;
	}
};

interface TIntentionBehaviorIconProps {
	behavior: specta.IntentionBehavior;
}
