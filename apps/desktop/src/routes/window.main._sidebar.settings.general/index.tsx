import { createFileRoute } from '@tanstack/react-router';
import { SettingsIcon, SettingsPage } from '@/components';

export const Route = createFileRoute('/window/main/_sidebar/settings/general/')({
	component: RouteComponent
});

function RouteComponent() {
	return (
		<SettingsPage
			title="General"
			subtitle="App-wide preferences."
			icon={<SettingsIcon />}
			iconVariant="neutral"
			backLabel="Back"
			backTo="/window/main/home"
		>
			<div className="text-base-950">Hello General Settings</div>
			<div className="h-500 w-full bg-red-200" />
		</SettingsPage>
	);
}
