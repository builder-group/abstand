import { createFileRoute } from '@tanstack/react-router';
import React from 'react';
import { ContentPage } from '@/components';

export const Route = createFileRoute('/window/main/_sidebar/today/')({
	component: RouteComponent
});

function RouteComponent() {
	const todayLabel = React.useMemo(
		() =>
			new Intl.DateTimeFormat('en-US', {
				weekday: 'long',
				month: 'long',
				day: 'numeric'
			}).format(new Date()),
		[]
	);

	return (
		<ContentPage title={todayLabel}>
			<div className="text-base-950">Hello Today</div>
			<div className="h-500 w-full bg-red-100" />
		</ContentPage>
	);
}
