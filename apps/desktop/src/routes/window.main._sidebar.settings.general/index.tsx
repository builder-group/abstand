import { createFileRoute } from '@tanstack/react-router';
import { useCompute } from 'feature-react/state';
import React from 'react';
import {
	Button,
	MonitorIcon,
	MoonIcon,
	SegmentedControl,
	SegmentedControlItem,
	Select,
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
	const [automaticallyCheckUpdates, setAutomaticallyCheckUpdates] = React.useState(true);
	const [automaticallyDownloadUpdates, setAutomaticallyDownloadUpdates] = React.useState(false);
	const [releaseChannel, setReleaseChannel] = React.useState('production');

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

	const handleReleaseChannelChange = React.useCallback(
		(event: React.ChangeEvent<HTMLSelectElement>) => {
			setReleaseChannel(event.target.value);
		},
		[]
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
			<SettingsGroup title="Updates">
				<SettingsRow label="Automatically check for updates">
					<Switch
						checked={automaticallyCheckUpdates}
						onCheckedChange={setAutomaticallyCheckUpdates}
					/>
				</SettingsRow>
				<SettingsRow label="Automatically download updates">
					<Switch
						checked={automaticallyDownloadUpdates}
						onCheckedChange={setAutomaticallyDownloadUpdates}
					/>
				</SettingsRow>
				<SettingsRow label="Release channel">
					<Select variant="ghost" value={releaseChannel} onChange={handleReleaseChannelChange}>
						<option value="production">Production</option>
						<option value="beta">Beta</option>
						<option value="nightly">Nightly</option>
					</Select>
					<Button type="button">Check for updates</Button>
				</SettingsRow>
			</SettingsGroup>
		</SettingsPage>
	);
}
