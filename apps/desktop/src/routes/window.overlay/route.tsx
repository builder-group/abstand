import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/window/overlay')({
	component: RouteComponent
});

function RouteComponent() {
	return <Outlet />;
}
