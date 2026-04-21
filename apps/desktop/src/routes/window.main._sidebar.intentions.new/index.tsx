import { createFileRoute } from '@tanstack/react-router';
import { ContentPage } from '@/components';

export const Route = createFileRoute('/window/main/_sidebar/intentions/new/')({
	component: RouteComponent
});

function RouteComponent() {
	return (
		<ContentPage
			title="New Intention"
			subtitle="Choose the kind of Abstand you want to create."
		></ContentPage>
	);
}
