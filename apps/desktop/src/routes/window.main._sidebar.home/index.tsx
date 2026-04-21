import { createFileRoute } from '@tanstack/react-router';
import { ContentPage } from '@/components';

export const Route = createFileRoute('/window/main/_sidebar/home/')({
	component: RouteComponent
});

function RouteComponent() {
	return (
		<ContentPage title="Home" backLabel="Back" backTo="/window/main/home">
			<div className="text-base-950">Hello Home</div>
			<div className="h-500 w-full bg-red-200" />
		</ContentPage>
	);
}
