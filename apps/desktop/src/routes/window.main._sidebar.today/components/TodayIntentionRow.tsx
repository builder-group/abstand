import { Link } from '@tanstack/react-router';
import React from 'react';
import { MonitorPauseIcon, ShieldIcon } from '@/components';
import { type specta } from '@/environment';
import { SettingsRowFrame } from '@/modules/settings';

export const TodayIntentionRow: React.FC<TTodayIntentionRowProps> = (props) => {
	const { intention, description } = props;

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
				<span className="text-base-400 truncate text-xs">{description}</span>
			</div>
		</SettingsRowFrame>
	);
};

interface TTodayIntentionRowProps {
	intention: specta.Intention;
	description: string;
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
