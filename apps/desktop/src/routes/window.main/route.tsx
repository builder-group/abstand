import { createFileRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { AppProvider } from '@/components';

export const Route = createFileRoute('/window/main')({
	component: RouteComponent
});

function RouteComponent() {
	return (
		<AppProvider>
			<Outlet />
			{import.meta.env.DEV ? (
				<TanStackRouterDevtools
					position="bottom-right"
					toggleButtonProps={{
						style: {
							width: '1rem',
							height: '1rem',
							overflow: 'hidden'
						}
					}}
				/>
			) : null}
		</AppProvider>
	);
}
