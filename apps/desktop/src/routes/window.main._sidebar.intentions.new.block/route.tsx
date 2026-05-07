import { createFileRoute, Outlet } from '@tanstack/react-router';
import { NewBlockIntentionCxProvider } from '@/modules/intentions';

export const Route = createFileRoute('/window/main/_sidebar/intentions/new/block')({
	component: LayoutComponent
});

function LayoutComponent() {
	return (
		<NewBlockIntentionCxProvider>
			<Outlet />
		</NewBlockIntentionCxProvider>
	);
}
