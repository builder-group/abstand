import { Link } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import {
	PlusIcon,
	SearchIcon,
	SettingsIcon,
	ShieldIcon,
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

	return (
		<div className={cn('flex h-full flex-col', className)}>
			<WindowHeaderRow />

			{/* Top nav */}
			<div className="border-base-100/80 flex flex-col gap-0.5 border-b px-2 py-2">
				<SidebarItem icon={<SunIcon />} label="Today" to="/window/main/today" exact />
				<SidebarItem
					icon={<PlusIcon />}
					label="New Intention"
					to="/window/main/intentions/new"
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
				<span className="text-base-500 mb-1 px-2 py-0.5 text-sm font-light">Intentions</span>
				<div className="flex flex-col gap-0.5">
					{intentionIds?.map((id) => (
						<IntentionListItem key={id} id={id} />
					))}
				</div>
			</div>

			{/* Footer */}
			<div className="border-base-100/80 flex flex-col gap-0.5 border-t px-2 py-2">
				<SidebarItem icon={<SettingsIcon />} label="Settings" to="/window/main/settings" />
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
	const intention = useFeatureState(intentionsCx.intentions[id]);

	if (intention == null) {
		return null;
	}

	return (
		<Link
			to="/window/main/intentions/$intentionId"
			params={{ intentionId: String(id) }}
			className={cn(
				'flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left',
				'text-base-600 text-sm transition-colors',
				"hover:bg-base-950/6 hover:text-base-950 focus-ring border border-transparent select-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
				'data-[status=active]:bg-base-950/10 data-[status=active]:text-base-950'
			)}
		>
			<IntentionBehaviorIcon behavior={intention.behavior} />
			<span className="min-w-0 flex-1 truncate">{intention.name}</span>
		</Link>
	);
};

interface TIntentionListItemProps {
	id: number;
}

const IntentionBehaviorIcon: React.FC<TIntentionBehaviorIconProps> = (props) => {
	const { behavior } = props;

	switch (behavior.type) {
		case 'block':
			return <ShieldIcon className="text-base-400 size-3.5" />;
		case 'break':
			return <TimerIcon className="text-base-400 size-3.5" />;
	}
};

interface TIntentionBehaviorIconProps {
	behavior: specta.IntentionBehavior;
}
