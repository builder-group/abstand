import { createFileRoute } from '@tanstack/react-router';
import { SettingsPage, WrenchIcon } from '@/components';

export const Route = createFileRoute('/window/main/_sidebar/settings/developer/')({
	component: RouteComponent
});

function RouteComponent() {
	return (
		<SettingsPage
			title="Developer"
			subtitle="Tools and settings for development."
			icon={<WrenchIcon />}
			iconVariant="warning"
		>
			<p>Hello developer settings</p>
		</SettingsPage>
	);
}
