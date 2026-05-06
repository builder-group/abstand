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
	Slider,
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
	const fontScale = useCompute(settingsCx.$appSettings, ({ value }) => value.appearance.fontScale);
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

	const handleFontScaleChange = React.useCallback(
		(values: number | readonly number[]) => {
			const nextFontScale: number = Array.isArray(values) ? values[0] : values;

			// Note: Mutate and notify immediately so subscribers (e.g. TypographyProvider) apply
			// the new font scale live while dragging; persistence happens on commit
			settingsCx.$appSettings._v.appearance.fontScale = nextFontScale;
			settingsCx.$appSettings._notify();
		},
		[settingsCx]
	);

	const handleFontScaleCommit = React.useCallback(
		async (values: number | readonly number[]) => {
			const nextFontScale: number = Array.isArray(values) ? values[0] : values;
			await settingsCx.update({
				appearance: { fontScale: nextFontScale }
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
				<SettingsRow label="Theme" variant="compact">
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
				<SettingsRow
					label="Text size"
					description="Scale interface text from the system default."
					contentClassName="gap-2"
				>
					<span
						className="text-base-400 w-3 text-center text-xs font-medium select-none"
						aria-hidden
					>
						A
					</span>
					<Slider
						min={0.85}
						max={1.3}
						step={0.05}
						value={[fontScale]}
						onValueChange={handleFontScaleChange}
						onValueCommitted={handleFontScaleCommit}
						showTicks
						className="min-w-32"
						aria-label="Text size"
					/>
					<span
						className="text-base-400 w-4 text-center text-base leading-none font-medium select-none"
						aria-hidden
					>
						A
					</span>
					<span className="text-base-400 w-10 text-right text-xs tabular-nums">
						{formatFontScale(fontScale)}
					</span>
				</SettingsRow>
			</SettingsGroup>
			<SettingsGroup title="Features">
				<SettingsRow label="Developer" description="Enable developer tools and settings.">
					<Switch checked={developerEnabled} onCheckedChange={handleDeveloperToggle} />
				</SettingsRow>
			</SettingsGroup>
			<SettingsGroup title="Updates">
				<SettingsRow label="Automatically check for updates" variant="compact">
					<Switch
						checked={automaticallyCheckUpdates}
						onCheckedChange={setAutomaticallyCheckUpdates}
					/>
				</SettingsRow>
				<SettingsRow label="Automatically download updates" variant="compact">
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

const formatFontScale = (value: number) => `${Math.round(value * 100)}%`;
