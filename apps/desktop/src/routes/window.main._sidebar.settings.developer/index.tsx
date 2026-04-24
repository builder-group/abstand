import { createFileRoute } from '@tanstack/react-router';
import React from 'react';
import { ChevronRightIcon, CodeXmlIcon, FolderOpenIcon, SettingsPage } from '@/components';
import { specta } from '@/environment';
import { SettingsGroup, SettingsRow } from '@/modules/settings';

export const Route = createFileRoute('/window/main/_sidebar/settings/developer/')({
	component: RouteComponent
});

function RouteComponent() {
	const handleOpenDataDirectory = React.useCallback(async () => {
		await specta.commands.openDataDirectory();
	}, []);

	// MARK: - UI

	return (
		<SettingsPage
			title="Developer"
			subtitle="Tools and settings for development."
			icon={<CodeXmlIcon />}
			iconVariant="secondary"
		>
			<SettingsGroup title="App">
				<SettingsRow
					label="Data Directory"
					description="Open app data folder in Finder."
					render={<button onClick={handleOpenDataDirectory} />}
				>
					<FolderOpenIcon size={16} className="text-base-400" />
					<ChevronRightIcon size={14} className="text-base-400" />
				</SettingsRow>
			</SettingsGroup>
		</SettingsPage>
	);
}
