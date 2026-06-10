import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/window/overlay/blocking/')({
	component: RouteComponent
});

function RouteComponent() {
	return (
		<main className="grid h-screen w-screen place-items-center bg-transparent text-center select-none">
			<h1 className="text-base-950 text-4xl font-semibold">Block Overlay</h1>
		</main>
	);
}
