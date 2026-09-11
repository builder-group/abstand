import { createFileRoute } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { CommandIcon, SettingsPage, useToastsCx } from '@/components';
import { specta } from '@/environment';
import { SettingsGroup, SettingsRow } from '@/modules/settings';
import { ShortcutRecorder, useShortcutsCx } from '@/modules/shortcuts';

export const Route = createFileRoute('/window/main/_sidebar/settings/shortcuts/')({
	component: RouteComponent
});

function RouteComponent() {
	const shortcutsCx = useShortcutsCx();
	const toastsCx = useToastsCx();
	const configs = useFeatureState(shortcutsCx.$configs);

	const handleChange = React.useCallback(
		async (action: specta.ShortcutAction, shortcut: specta.KeyboardShortcut | null) => {
			const [isUpdateOk, updateErr] = await shortcutsCx.updateShortcut(action, shortcut);
			if (!isUpdateOk) {
				toastsCx.add({
					type: 'error',
					title: 'Could not save shortcut',
					description: updateErr
				});
			}
		},
		[shortcutsCx, toastsCx]
	);

	// MARK: - UI

	return (
		<SettingsPage
			title="Shortcuts"
			subtitle="Keyboard shortcuts for common actions."
			icon={<CommandIcon />}
			iconVariant="warning"
		>
			<SettingsGroup title="App">
				<ShortcutSettingsRow label="Search" config={configs.search} onChange={handleChange} />
				<ShortcutSettingsRow
					label="New Intention"
					config={configs.newIntention}
					onChange={handleChange}
				/>
				<ShortcutSettingsRow
					label="Toggle Sidebar"
					config={configs.toggleSidebar}
					onChange={handleChange}
				/>
			</SettingsGroup>
		</SettingsPage>
	);
}

const ShortcutSettingsRow: React.FC<TShortcutSettingsRowProps> = (props) => {
	const { label, config, onChange } = props;
	if (config == null) {
		return null;
	}

	return (
		<SettingsRow label={label} variant="compact">
			<ShortcutRecorder
				value={config.shortcut}
				onChange={(shortcut) => void onChange(config.action, shortcut)}
			/>
		</SettingsRow>
	);
};

interface TShortcutSettingsRowProps {
	label: string;
	config?: specta.ShortcutActionConfigDto;
	onChange: (
		action: specta.ShortcutAction,
		shortcut: specta.KeyboardShortcut | null
	) => Promise<void>;
}
