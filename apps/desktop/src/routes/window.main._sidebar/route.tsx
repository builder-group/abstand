import { createFileRoute, Outlet } from '@tanstack/react-router';
import React from 'react';
import { PanelLeftCloseIcon, PanelLeftOpenIcon, Toggle, Tooltip, WindowHeader } from '@/components';
import { cn } from '@/lib';
import { useOnShortcut, useShortcutHint } from '@/modules/shortcuts';
import { SidebarContent } from './components';

export const Route = createFileRoute('/window/main/_sidebar')({
	component: LayoutComponent
});

function LayoutComponent() {
	const [sidebarOpen, setSidebarOpen] = React.useState(true);
	const toggleSidebarHint = useShortcutHint('toggleSidebar');

	// MARK: - Effects

	useOnShortcut('toggleSidebar', () => {
		setSidebarOpen((v) => !v);
	});

	// MARK: - UI

	return (
		<>
			<WindowHeader
				floating
				compact={!sidebarOpen}
				leading={
					<Tooltip content="Toggle sidebar" shortcut={toggleSidebarHint} side="bottom">
						<Toggle
							aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
							variant="icon"
							size="icon-sm"
							pressed={sidebarOpen}
							onPressedChange={setSidebarOpen}
							className="ml-2"
						>
							{sidebarOpen ? (
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
					className={cn(
						'shrink-0 overflow-hidden transition-[width] duration-200 ease-in-out select-none',
						sidebarOpen ? 'w-56' : 'w-0'
					)}
				>
					<SidebarContent />
				</nav>

				{/* Content */}
				<div
					className={cn(
						'border-base-100 bg-base-0 flex flex-1 overflow-hidden transition-[border-radius] duration-200 ease-in-out',
						sidebarOpen ? 'rounded-l-xl border-l' : 'rounded-none border-l-0'
					)}
				>
					<Outlet />
				</div>
			</div>
		</>
	);
}
