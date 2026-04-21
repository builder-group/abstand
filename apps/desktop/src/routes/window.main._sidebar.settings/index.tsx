import { createFileRoute } from '@tanstack/react-router';
import { SettingsPage } from '@/components';

export const Route = createFileRoute('/window/main/_sidebar/settings/')({
	component: RouteComponent
});

function RouteComponent() {
	return (
		<SettingsPage title="Settings" backLabel="Back" backTo="/window/main/home">
			<div className="text-base-950">Hello Settings</div>
			<div className="h-500 w-full bg-red-200" />
		</SettingsPage>
	);
}
