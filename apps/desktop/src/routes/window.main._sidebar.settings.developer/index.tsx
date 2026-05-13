import { createFileRoute, Link } from '@tanstack/react-router';
import React from 'react';
import {
	ChevronRightIcon,
	CodeXmlIcon,
	FolderOpenIcon,
	SettingsPage,
	useToastsCx
} from '@/components';
import { specta } from '@/environment';
import { toTuple } from '@/lib';
import { SettingsGroup, SettingsRow } from '@/modules/settings';

export const Route = createFileRoute('/window/main/_sidebar/settings/developer/')({
	component: RouteComponent
});

function RouteComponent() {
	const toastsCx = useToastsCx();

	const handleOpenDataDirectory = React.useCallback(async () => {
		const [isOpenOk, openErr] = toTuple(await specta.commands.openDataDirectory());
		if (!isOpenOk) {
			toastsCx.add({
				type: 'error',
				title: 'Could not open data directory',
				description: openErr
			});
		}
	}, [toastsCx]);

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
					<FolderOpenIcon className="text-base-400 size-4" />
					<ChevronRightIcon className="text-base-400" />
				</SettingsRow>
				<SettingsRow
					label="UI Playground"
					description="Preview shared desktop components and sizing."
					render={<Link to="/window/main/settings/developer/ui-playground" />}
				>
					<ChevronRightIcon className="text-base-400" />
				</SettingsRow>
			</SettingsGroup>
		</SettingsPage>
	);
}
