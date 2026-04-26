import { createFileRoute } from '@tanstack/react-router';
import { ContentPage } from '@/components';

export const Route = createFileRoute('/window/main/_sidebar/intentions/new/block/')({
	component: RouteComponent
});

function RouteComponent() {
	return (
		<ContentPage
			title="Block Intention"
			subtitle="Configure your Block."
			backTo="/window/main/intentions/new"
		></ContentPage>
	);
}
