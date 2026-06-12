import { createFileRoute, Outlet } from '@tanstack/react-router';
import { MainWindowProvider } from '@/components';

export const Route = createFileRoute('/window/main')({
	component: RouteComponent
});

function RouteComponent() {
	return (
		<MainWindowProvider>
			<Outlet />
		</MainWindowProvider>
	);
}
