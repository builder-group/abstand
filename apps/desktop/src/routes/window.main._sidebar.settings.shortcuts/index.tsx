import { createFileRoute } from '@tanstack/react-router';
import { useCompute } from 'feature-react/state';
import React from 'react';
import { CommandIcon, SettingsPage } from '@/components';
import { specta } from '@/environment';
import { SettingsGroup, SettingsRow, useSettingsCx } from '@/modules/settings';
import { ShortcutRecorder, shortcutsConfig } from '@/modules/shortcuts';

export const Route = createFileRoute('/window/main/_sidebar/settings/shortcuts/')({
	component: RouteComponent
});

function RouteComponent() {
	const settingsCx = useSettingsCx();
	const shortcuts = useCompute(settingsCx.$appSettings, ({ value }) => value.shortcuts);

	const handleChange = React.useCallback(
		async (action: specta.ShortcutAction, shortcut: specta.KeyboardShortcut) => {
			await settingsCx.update({
				shortcuts: { ...settingsCx.$appSettings.get().shortcuts, [action]: shortcut }
			});
		},
		[settingsCx]
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
				{(Object.keys(shortcuts) as specta.ShortcutAction[]).map((action) => (
					<SettingsRow key={action} label={shortcutsConfig.actionLabels[action]}>
						<ShortcutRecorder
							value={shortcuts[action]}
							onChange={(shortcut) => void handleChange(action, shortcut)}
						/>
					</SettingsRow>
				))}
			</SettingsGroup>
		</SettingsPage>
	);
}
