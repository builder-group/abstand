import { createFileRoute, Outlet } from '@tanstack/react-router';
import { NewIntentionCxProvider } from '@/modules/intentions';

export const Route = createFileRoute('/window/main/_sidebar/intentions/new')({
	component: LayoutComponent
});

function LayoutComponent() {
	return (
		<NewIntentionCxProvider>
			<Outlet />
		</NewIntentionCxProvider>
	);
}
