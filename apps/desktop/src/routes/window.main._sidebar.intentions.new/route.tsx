import { createFileRoute, Outlet } from '@tanstack/react-router';
import React from 'react';
import { useSidebarCx } from '../window.main._sidebar/SidebarCx';

export const Route = createFileRoute('/window/main/_sidebar/intentions/new')({
	component: LayoutComponent
});

function LayoutComponent() {
	const sidebarCx = useSidebarCx();

	// Hide sidebar during creation so the flow gets full focus, restore on exit
	React.useEffect(() => {
		const wasOpen = sidebarCx.$isOpen._v;
		sidebarCx.close();
		return () => {
			if (wasOpen) sidebarCx.open();
		};
	}, [sidebarCx]);

	return <Outlet />;
}
