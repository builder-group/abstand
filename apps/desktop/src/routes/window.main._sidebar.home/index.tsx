import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/window/main/_sidebar/home/')({
	component: RouteComponent
});

function RouteComponent() {
	return (
		<div className="flex h-full items-center justify-center px-6 py-6">
			<h1 className="text-base-950 text-5xl leading-none font-bold tracking-tight sm:text-6xl">
				Hello Home
			</h1>
		</div>
	);
}
