import { Link } from '@tanstack/react-router';
import { useCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import {
	PlusIcon,
	SearchIcon,
	SettingsIcon,
	ShieldIcon,
	Spinner,
	SunIcon,
	TimerIcon,
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
				<span className="text-base-500 px-2 text-sm font-light">Intentions</span>
				<div className="flex flex-col gap-0.5 py-1.5">
					{intentionIds.length > 0 ? (
						intentionIds.map((id) => <IntentionListItem key={id} id={id} />)
					) : areIntentionsLoading ? (
						<div className="text-base-400 flex items-center gap-1 px-2 py-1 text-sm">
							<Spinner />
							<span>Loading intentions...</span>
						</div>
					) : (
						<p className="text-base-400 px-2 py-1 text-sm">
							No intentions yet.{' '}
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

	if (intention == null) {
		return null;
	}

	return (
		<SidebarItem
			icon={<IntentionBehaviorIcon behavior={intention.behavior} />}
			label={intention.name}
			trailing={isActive ? <ActiveIntentionIndicator /> : undefined}
			render={<Link to="/window/main/intentions/$intentionId" params={{ intentionId: id }} />}
		/>
	);
};

interface TIntentionListItemProps {
	id: number;
}

const ActiveIntentionIndicator: React.FC = () => {
	return (
		<span className="bg-success size-2 shrink-0 rounded-full" title="Active Abstand">
			<span className="sr-only">Active Abstand</span>
		</span>
	);
};

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
