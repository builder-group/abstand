import { createFileRoute } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { CommandIcon, SettingsPage } from '@/components';
import { specta } from '@/environment';
import { SettingsGroup, SettingsRow } from '@/modules/settings';
import { ShortcutRecorder, shortcutsConfig, useShortcutsCx } from '@/modules/shortcuts';

export const Route = createFileRoute('/window/main/_sidebar/settings/shortcuts/')({
	component: RouteComponent
});

function RouteComponent() {
	const shortcutsCx = useShortcutsCx();
	const configs = useFeatureState(shortcutsCx.$configs);

	const handleChange = React.useCallback(
		async (action: specta.ShortcutAction, shortcut: specta.KeyboardShortcut | null) => {
			await shortcutsCx.updateShortcut(action, shortcut);
		},
		[shortcutsCx]
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
				{configs.map((config) => (
					<SettingsRow key={config.action} label={shortcutsConfig.actions[config.action].label}>
						<ShortcutRecorder
							value={config.shortcut}
							onChange={(shortcut) => void handleChange(config.action, shortcut)}
						/>
					</SettingsRow>
				))}
			</SettingsGroup>
		</SettingsPage>
	);
}
