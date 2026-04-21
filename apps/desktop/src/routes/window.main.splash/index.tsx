import { createFileRoute, useNavigate } from '@tanstack/react-router';
import React from 'react';
import { LogoIcon, WindowHeader } from '@/components';

export const Route = createFileRoute('/window/main/splash/')({
	component: RouteComponent
});

function RouteComponent() {
	const navigate = useNavigate();

	// MARK: - Effects

	React.useEffect(() => {
		const splashTimer = setTimeout(() => {
			void navigate({ to: '/window/main/home' });
		}, 1000);

		return () => {
			clearTimeout(splashTimer);
		};
	}, [navigate]);

	// MARK: - UI

	return (
		<main className="relative flex h-screen items-center justify-center">
			<WindowHeader floating />
			<LogoIcon className="text-base-950 size-20" />
		</main>
	);
}
