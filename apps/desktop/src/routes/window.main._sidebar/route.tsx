import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import { PanelLeftCloseIcon, PanelLeftOpenIcon, Toggle, Tooltip, WindowHeader } from '@/components';
import { cn } from '@/lib';
import { IntentionsCxProvider } from '@/modules/intentions';
import { useShortcutHint } from '@/modules/shortcuts';
import { SidebarContent } from './components';
import { SidebarCxProvider, useSidebarCx } from './SidebarCx';

export const Route = createFileRoute('/window/main/_sidebar')({
	component: LayoutComponent
});

function LayoutComponent() {
	return (
		<SidebarCxProvider>
			<IntentionsCxProvider>
				<SidebarLayout />
			</IntentionsCxProvider>
		</SidebarCxProvider>
	);
}

function SidebarLayout() {
	const sidebarCx = useSidebarCx();
	const isOpen = useFeatureState(sidebarCx.$isOpen);
	const toggleSidebarHint = useShortcutHint('toggleSidebar');

	return (
		<>
			<WindowHeader
				floating
				compact={!isOpen}
				leading={
					<Tooltip content="Toggle sidebar" shortcut={toggleSidebarHint} side="bottom">
						<Toggle
							aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
							variant="ghost"
							size="icon-sm"
							pressed={isOpen}
							onPressedChange={(pressed) => (pressed ? sidebarCx.open() : sidebarCx.close())}
							className="ml-0.5"
						>
							{isOpen ? (
								<PanelLeftCloseIcon className="size-3.5" />
							) : (
								<PanelLeftOpenIcon className="size-3.5" />
							)}
						</Toggle>
					</Tooltip>
				}
			/>
			<div className="bg-base-50/90 flex h-screen overflow-hidden">
				{/* Sidebar */}
				<nav
					aria-hidden={!isOpen}
					inert={!isOpen}
					className={cn(
						'shrink-0 overflow-hidden transition-[width] duration-200 ease-in-out select-none',
						isOpen ? 'w-56' : 'w-0'
					)}
				>
					<SidebarContent />
				</nav>

				{/* Content */}
				<div
					className={cn(
						'border-base-100 bg-base-0 flex flex-1 overflow-hidden transition-[border-radius] duration-200 ease-in-out',
						isOpen ? 'rounded-l-xl border-l' : 'rounded-none border-l-0'
					)}
				>
					<Outlet />
				</div>
			</div>
		</>
	);
}
