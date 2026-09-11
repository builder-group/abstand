import { createRootRoute, Outlet } from '@tanstack/react-router';
import { AppProvider } from '@/components';

export const Route = createRootRoute({
	component: RootComponent
});

function RootComponent() {
	return (
		<AppProvider>
			<Outlet />
		</AppProvider>
	);
}
