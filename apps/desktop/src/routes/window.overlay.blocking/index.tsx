import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/window/overlay/blocking/')({
	component: RouteComponent
});

function RouteComponent() {
	return (
		<main className="bg-base-0/70 supports-backdrop-filter:bg-base-0/60 flex h-screen w-screen items-center text-center select-none supports-backdrop-filter:backdrop-blur-2xl">
			<h1 className="text-base-950 text-4xl font-semibold">Block Overlay</h1>
		</main>
	);
}
