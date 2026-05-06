import { createFileRoute, Link } from '@tanstack/react-router';
import { Badge, ContentPage, ShieldIcon, TimerIcon } from '@/components';
import { SettingsGroup } from '@/modules/settings';

export const Route = createFileRoute('/window/main/_sidebar/intentions/new/')({
	component: RouteComponent
});

function RouteComponent() {
	return (
		<ContentPage title="New Intention" subtitle="Choose a behavior." backTo="/window/main/today">
			<SettingsGroup contentClassName="grid grid-cols-2 gap-3 px-2.5 py-2">
				<Link
					to="/window/main/intentions/new/block"
					className="group flex flex-col gap-2 outline-none"
				>
					<div className="group-hover:ring-primary group-focus-visible:ring-primary ring-offset-base-50 flex h-30 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-purple-900 ring-2 ring-transparent ring-offset-2 transition">
						<ShieldIcon className="size-7 text-white/50" />
					</div>
					<div>
						<p className="text-base-950 text-sm">Block</p>
						<p className="text-base-500 text-xs">
							Builds a hard wall for the duration. Apps and websites stay inaccessible until the
							end.
						</p>
					</div>
				</Link>

				<div className="flex flex-col gap-2 opacity-40">
					<div className="flex h-30 items-center justify-center rounded-xl bg-linear-to-br from-emerald-400 to-teal-700">
						<TimerIcon className="size-7 text-white/50" />
					</div>
					<div>
						<div className="flex items-center gap-1.5">
							<p className="text-base-950 text-sm">Break</p>
							<Badge variant="outline">Coming soon</Badge>
						</div>
						<p className="text-base-500 text-xs">
							A rhythm of forced breaks over a longer window, with a one-minute warning before each.
						</p>
					</div>
				</div>
			</SettingsGroup>
		</ContentPage>
	);
}
