import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { AppProvider } from '@/components';

export const Route = createRootRoute({
	component: RootComponent
});

function RootComponent() {
	return (
		<AppProvider>
			<Outlet />
			{import.meta.env.DEV ? <TanStackRouterDevtools position="bottom-right" /> : null}
		</AppProvider>
	);
}
