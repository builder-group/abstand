import { createFileRoute, Link } from '@tanstack/react-router';
import React from 'react';
import {
	Badge,
	Button,
	ContentPage,
	MonitorIcon,
	MonitorPauseIcon,
	ShieldIcon,
	TimerIcon
} from '@/components';
import { SettingsGroup } from '@/modules/settings';

export const Route = createFileRoute('/window/main/_sidebar/intentions/new/')({
	component: RouteComponent
});

function RouteComponent() {
	const [areConceptsVisible, setAreConceptsVisible] = React.useState(false);

	const handleConceptsVisibilityToggle = React.useCallback(() => {
		setAreConceptsVisible((value) => !value);
	}, []);

	return (
		<ContentPage
			title="New Intention"
			subtitle="Set a commitment in advance. Abstand holds it when the time comes."
			backTo="/window/main/today"
		>
			<div className="space-y-2.5">
				<SettingsGroup contentClassName="grid grid-cols-2 gap-3 px-2.5 py-2.5">
					<Link
						to="/window/main/intentions/new/block"
						className="group flex flex-col gap-2 outline-none"
					>
						<div className="group-hover:ring-primary group-focus-visible:ring-primary ring-offset-base-50 flex h-30 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-purple-900 ring-2 ring-transparent ring-offset-2 transition">
							<ShieldIcon className="size-7 text-white/50" />
						</div>
						<div>
							<p className="text-base-950 text-sm">Block</p>
							<p className="text-base-500 mt-px text-xs">
								Keeps selected apps and websites out of reach until the Intention ends.
							</p>
						</div>
					</Link>

					<div className="flex flex-col gap-2 opacity-40">
						<div className="flex h-30 items-center justify-center rounded-xl bg-linear-to-br from-emerald-400 to-teal-700">
							<MonitorPauseIcon className="size-7 text-white/50" />
						</div>
						<div>
							<div className="flex items-center gap-1.5">
								<p className="text-base-950 text-sm">Break</p>
								<Badge variant="outline">Coming soon</Badge>
							</div>
							<p className="text-base-500 mt-px text-xs">
								Schedules screen breaks during longer sessions, so you can rest your eyes and reset
								your posture.
							</p>
						</div>
					</div>
				</SettingsGroup>

				<div className="text-base-500 flex flex-wrap items-center gap-x-1.5 gap-y-1 px-2.5 text-xs">
					<span>Need a different kind of Intention? Tell me what would help you most.</span>
					<Button
						type="button"
						variant="link"
						aria-expanded={areConceptsVisible}
						aria-controls={conceptGroupId}
						onClick={handleConceptsVisibilityToggle}
						className="h-auto rounded-xs px-0 text-xs"
					>
						{areConceptsVisible ? 'Hide concepts' : 'Show more concepts'}
					</Button>
				</div>

				{areConceptsVisible && (
					<SettingsGroup
						id={conceptGroupId}
						contentClassName="grid grid-cols-2 gap-3 px-2.5 py-2.5"
					>
						<div className="flex flex-col gap-2 opacity-40">
							<div className="flex h-30 items-center justify-center rounded-xl bg-linear-to-br from-amber-300 to-orange-700">
								<TimerIcon className="size-7 text-white/50" />
							</div>
							<div>
								<div className="flex items-center gap-1.5">
									<p className="text-base-950 text-sm">Flow</p>
									<Badge variant="outline">Concept</Badge>
								</div>
								<p className="text-base-500 mt-px text-xs">
									Starts with small focus blocks, adapts each round, and helps momentum build.
								</p>
							</div>
						</div>

						<div className="flex flex-col gap-2 opacity-40">
							<div className="flex h-30 items-center justify-center rounded-xl bg-linear-to-br from-sky-400 to-blue-800">
								<MonitorIcon className="size-7 text-white/50" />
							</div>
							<div>
								<div className="flex items-center gap-1.5">
									<p className="text-base-950 text-sm">Focus</p>
									<Badge variant="outline">Concept</Badge>
								</div>
								<p className="text-base-500 mt-px text-xs">
									Keeps one chosen app clear while every other app blurs into the background.
								</p>
							</div>
						</div>
					</SettingsGroup>
				)}
			</div>
		</ContentPage>
	);
}

const conceptGroupId = 'new-intention-concepts';
