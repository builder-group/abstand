import { createFileRoute } from '@tanstack/react-router';
import { useCompute } from 'feature-react/state';
import React from 'react';
import {
	MonitorIcon,
	MoonIcon,
	SegmentedControl,
	SegmentedControlItem,
	SettingsIcon,
	SettingsPage,
	SunIcon,
	Switch
} from '@/components';
import type { specta } from '@/environment';
import { SettingsGroup, SettingsRow, useSettingsCx } from '@/modules/settings';

export const Route = createFileRoute('/window/main/_sidebar/settings/general/')({
	component: RouteComponent
});

function RouteComponent() {
	const settingsCx = useSettingsCx();
	const theme = useCompute(settingsCx.$appSettings, ({ value }) => value.appearance.theme);
	const developerEnabled = useCompute(
		settingsCx.$appSettings,
		({ value }) => value.developer.enabled
	);

	// MARK: - Actions

	const handleThemeChange = React.useCallback(
		async (themeValue: string) => {
			await settingsCx.update({
				appearance: { theme: themeValue as specta.Theme }
			});
		},
		[settingsCx]
	);

	const handleDeveloperToggle = React.useCallback(
		async (pressed: boolean) => {
			await settingsCx.update({ developer: { enabled: pressed } });
		},
		[settingsCx]
	);

	// MARK: - UI

	return (
		<SettingsPage
			title="General"
			subtitle="App-wide preferences."
			icon={<SettingsIcon />}
			iconVariant="neutral"
		>
			<SettingsGroup title="Appearance">
				<SettingsRow label="Theme" description="Choose how Abstand should appear across the app.">
					<SegmentedControl value={theme} onValueChange={handleThemeChange}>
						<SegmentedControlItem value="auto" aria-label="Auto theme" title="Auto theme">
							<MonitorIcon />
						</SegmentedControlItem>
						<SegmentedControlItem value="light" aria-label="Light theme" title="Light theme">
							<SunIcon />
						</SegmentedControlItem>
						<SegmentedControlItem value="dark" aria-label="Dark theme" title="Dark theme">
							<MoonIcon />
						</SegmentedControlItem>
					</SegmentedControl>
				</SettingsRow>
			</SettingsGroup>
			<SettingsGroup title="Features">
				<SettingsRow label="Developer" description="Enable developer tools and settings.">
					<Switch checked={developerEnabled} onCheckedChange={handleDeveloperToggle} />
				</SettingsRow>
			</SettingsGroup>
		</SettingsPage>
	);
}
