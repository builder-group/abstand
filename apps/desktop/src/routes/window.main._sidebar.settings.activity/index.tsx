import { createFileRoute } from '@tanstack/react-router';
import { useCompute } from 'feature-react/state';
import React from 'react';
import { ActivityIcon, SettingsPage, Switch, useToastsCx } from '@/components';
import { type specta } from '@/environment';
import { SettingsGroup, SettingsRow, useSettingsCx } from '@/modules/settings';

export const Route = createFileRoute('/window/main/_sidebar/settings/activity/')({
	component: RouteComponent
});

function RouteComponent() {
	return (
		<SettingsPage
			title="Activity"
			subtitle="Choose what activity Abstand records."
			icon={<ActivityIcon />}
			iconVariant="success"
		>
			<ForegroundSection />
		</SettingsPage>
	);
}

const ForegroundSection: React.FC = () => {
	const settingsCx = useSettingsCx();
	const toastsCx = useToastsCx();
	const activityEnabled = useCompute(settingsCx.$appSettings, (value) => value.activity.enabled);
	const foregroundSettings = useCompute(
		settingsCx.$appSettings,
		(value) => value.activity.foreground
	);

	// MARK: - Actions

	const saveForegroundSettings = React.useCallback(
		async (foreground: Partial<specta.ActivityForegroundSettings>) => {
			const [isUpdateOk, updateErr] = await settingsCx.update({ activity: { foreground } });
			if (!isUpdateOk) {
				toastsCx.add({
					type: 'error',
					title: 'Could not save setting',
					description: updateErr
				});
			}
		},
		[settingsCx, toastsCx]
	);

	const handleTrackAppsToggle = React.useCallback(
		(pressed: boolean) => {
			void saveForegroundSettings({ trackApps: pressed });
		},
		[saveForegroundSettings]
	);

	const handleTrackWindowsToggle = React.useCallback(
		(pressed: boolean) => {
			void saveForegroundSettings({ trackWindows: pressed });
		},
		[saveForegroundSettings]
	);

	const handleTrackBrowserToggle = React.useCallback(
		(pressed: boolean) => {
			void saveForegroundSettings({ trackBrowser: pressed });
		},
		[saveForegroundSettings]
	);

	const handleTrackPrivateBrowserToggle = React.useCallback(
		(pressed: boolean) => {
			void saveForegroundSettings({ trackPrivateBrowser: pressed });
		},
		[saveForegroundSettings]
	);

	// MARK: - UI

	return (
		<SettingsGroup title="Foreground">
			<SettingsRow label="Apps" description="Record the active app.">
				<Switch
					checked={foregroundSettings.trackApps}
					disabled={!activityEnabled}
					onCheckedChange={handleTrackAppsToggle}
				/>
			</SettingsRow>
			<SettingsRow label="Windows" description="Record active window details.">
				<Switch
					checked={foregroundSettings.trackWindows}
					disabled={!activityEnabled || !foregroundSettings.trackApps}
					onCheckedChange={handleTrackWindowsToggle}
				/>
			</SettingsRow>
			<SettingsRow label="Websites" description="Record active website details from browsers.">
				<Switch
					checked={foregroundSettings.trackBrowser}
					disabled={
						!activityEnabled || !foregroundSettings.trackApps || !foregroundSettings.trackWindows
					}
					onCheckedChange={handleTrackBrowserToggle}
				/>
			</SettingsRow>
			<SettingsRow label="Private browsing" description="Include private browser windows.">
				<Switch
					checked={foregroundSettings.trackPrivateBrowser}
					disabled={
						!activityEnabled ||
						!foregroundSettings.trackApps ||
						!foregroundSettings.trackWindows ||
						!foregroundSettings.trackBrowser
					}
					onCheckedChange={handleTrackPrivateBrowserToggle}
				/>
			</SettingsRow>
		</SettingsGroup>
	);
};
