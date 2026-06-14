import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
	component: RouteComponent
});

function RouteComponent() {
	return <main className="min-h-screen">Hello Abstand</main>;
}
