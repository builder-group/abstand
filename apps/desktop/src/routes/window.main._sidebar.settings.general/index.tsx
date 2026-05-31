import { createFileRoute } from '@tanstack/react-router';
import { useCompute } from 'feature-react/state';
import React from 'react';
import {
	ArrowUpRightIcon,
	Button,
	CircleCheckIcon,
	CircleSlashIcon,
	MonitorIcon,
	MoonIcon,
	SegmentedControl,
	SegmentedControlItem,
	Select,
	SettingsIcon,
	SettingsPage,
	Slider,
	Spinner,
	SunIcon,
	Switch,
	useToastsCx
} from '@/components';
import { appConfig, type specta } from '@/environment';
import { useAppInfo } from '@/hooks';
import { openExternalUrl, sleep } from '@/lib';
import { SettingsGroup, SettingsRow, SettingsRowFrame, useSettingsCx } from '@/modules/settings';

export const Route = createFileRoute('/window/main/_sidebar/settings/general/')({
	component: RouteComponent
});

function RouteComponent() {
	return (
		<SettingsPage
			title="General"
			subtitle="App-wide preferences."
			icon={<SettingsIcon />}
			iconVariant="neutral"
		>
			<AppearanceSection />
			<FeaturesSection />
			<UpdatesSection />
			<HelpFeedbackSection />
		</SettingsPage>
	);
}

const AppearanceSection: React.FC = () => {
	const settingsCx = useSettingsCx();
	const toastsCx = useToastsCx();
	const theme = useCompute(settingsCx.$appSettings, (value) => value.appearance.theme);
	const fontScale = useCompute(settingsCx.$appSettings, (value) => value.appearance.fontScale);

	// MARK: - Actions

	const handleThemeChange = React.useCallback(
		async (themeValue: string) => {
			const [isUpdateOk, updateErr] = await settingsCx.update({
				appearance: { theme: themeValue as specta.Theme }
			});
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

	const handleFontScaleChange = React.useCallback(
		(values: number | readonly number[]) => {
			const nextFontScale: number = Array.isArray(values) ? values[0] : values;

			// Note: Mutate and notify immediately so subscribers (e.g. TypographyProvider) apply
			// the new font scale live while dragging; persistence happens on commit
			// eslint-disable-next-line react-hooks/immutability
			settingsCx.$appSettings._v.appearance.fontScale = nextFontScale;
			settingsCx.$appSettings.notify();
		},
		[settingsCx]
	);

	const handleFontScaleCommit = React.useCallback(
		async (values: number | readonly number[]) => {
			const nextFontScale: number = Array.isArray(values) ? values[0] : values;
			const [isUpdateOk, updateErr] = await settingsCx.update({
				appearance: { fontScale: nextFontScale }
			});
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

	// MARK: - UI

	return (
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
				<span className="text-base-400 w-3 text-center text-xs font-medium select-none" aria-hidden>
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
	);
};

function formatFontScale(value: number) {
	return `${Math.round(value * 100)}%`;
}

const FeaturesSection: React.FC = () => {
	const settingsCx = useSettingsCx();
	const toastsCx = useToastsCx();
	const developerEnabled = useCompute(settingsCx.$appSettings, (value) => value.developer.enabled);

	// MARK: - Actions

	const handleDeveloperToggle = React.useCallback(
		async (pressed: boolean) => {
			const [isUpdateOk, updateErr] = await settingsCx.update({ developer: { enabled: pressed } });
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

	// MARK: - UI

	return (
		<SettingsGroup title="Features">
			<SettingsRow label="Developer" description="Enable developer tools and settings.">
				<Switch checked={developerEnabled} onCheckedChange={handleDeveloperToggle} />
			</SettingsRow>
		</SettingsGroup>
	);
};

const UpdatesSection: React.FC = () => {
	const appInfo = useAppInfo();

	const [releaseChannel, setReleaseChannel] = React.useState('stable');
	const [automaticallyCheckUpdates, setAutomaticallyCheckUpdates] = React.useState(true);
	const [updateStatus, setUpdateStatus] = React.useState<TUpdateStatus>(
		automaticallyCheckUpdates ? 'checking' : 'idle'
	);

	// MARK: - Actions

	const handleCheckUpdates = React.useCallback(() => {
		setUpdateStatus('checking');
	}, []);

	const handleAutomaticallyCheckUpdatesChange = React.useCallback((checked: boolean) => {
		setAutomaticallyCheckUpdates(checked);
		setUpdateStatus(checked ? 'checking' : 'idle');
	}, []);

	const handleReleaseChannelChange = React.useCallback(
		(event: React.ChangeEvent<HTMLSelectElement>) => {
			setReleaseChannel(event.target.value);
			setUpdateStatus(automaticallyCheckUpdates ? 'checking' : 'idle');
		},
		[automaticallyCheckUpdates]
	);

	// MARK: - Effects

	React.useEffect(() => {
		if (updateStatus !== 'checking') {
			return;
		}

		let isCancelled = false;
		void (async () => {
			console.info(`Checking updates for ${releaseChannel} release channel`);
			await sleep(2000);
			if (isCancelled) return;
			setUpdateStatus('upToDate');
		})();

		return () => {
			isCancelled = true;
		};
	}, [releaseChannel, updateStatus]);

	// MARK: - UI

	return (
		<div className="space-y-2.5">
			<SettingsGroup title="Updates">
				<SettingsRowFrame variant="default">
					{updateStatus === 'checking' ? (
						<>
							<p className="text-base-950 truncate text-sm">Checking for updates...</p>
							<Spinner size="md" />
						</>
					) : (
						<>
							<div className="flex min-w-0 items-center gap-2.5">
								{updateStatus === 'upToDate' ? (
									<span className="bg-success text-success-content flex size-7 shrink-0 items-center justify-center rounded-lg">
										<CircleCheckIcon
											aria-hidden
											className="[&_path]:stroke-success size-4 [&_circle]:fill-current"
										/>
									</span>
								) : (
									<span className="bg-base-100 text-base-500 flex size-7 shrink-0 items-center justify-center rounded-lg">
										<CircleSlashIcon aria-hidden className="size-4" />
									</span>
								)}
								<div className="min-w-0">
									<p className="text-base-950 truncate text-sm">
										{updateStatus === 'upToDate'
											? 'Abstand is up to date.'
											: 'Automatic update checks are off.'}
									</p>
									<p className="text-base-500 truncate text-xs">
										{appInfo.isPending ? 'Loading version...' : appInfo.version}
									</p>
								</div>
							</div>
							<Button type="button" onClick={handleCheckUpdates}>
								Check for Updates
							</Button>
						</>
					)}
				</SettingsRowFrame>
			</SettingsGroup>
			<SettingsGroup>
				<SettingsRow label="Automatically check for updates" variant="compact">
					<Switch
						checked={automaticallyCheckUpdates}
						onCheckedChange={handleAutomaticallyCheckUpdatesChange}
					/>
				</SettingsRow>
				<SettingsRow label="Release channel" variant="compact">
					<Select variant="ghost" value={releaseChannel} onChange={handleReleaseChannelChange}>
						<option value="stable">Stable</option>
						<option value="beta">Beta</option>
						<option value="nightly">Nightly</option>
					</Select>
				</SettingsRow>
			</SettingsGroup>
		</div>
	);
};

type TUpdateStatus = 'idle' | 'checking' | 'upToDate';

const HelpFeedbackSection: React.FC = () => {
	const handleOpenSupportUrl = React.useCallback((url: string) => {
		void openExternalUrl(url);
	}, []);

	return (
		<SettingsGroup title="Help & Feedback">
			{helpFeedbackLinks.map((link) => (
				<SettingsRow
					key={link.label}
					label={link.label}
					description={link.description}
					render={<button type="button" onClick={() => handleOpenSupportUrl(link.url)} />}
				>
					<ArrowUpRightIcon className="text-base-400" />
				</SettingsRow>
			))}
		</SettingsGroup>
	);
};

const helpFeedbackLinks = [
	{
		label: 'Join Discord',
		description: 'Chat with the community.',
		url: appConfig.help.discord
	},
	{
		label: 'Email support',
		description: 'Send a support email.',
		url: appConfig.help.mailto('Support')
	},
	{
		label: 'Report issue',
		description: 'Open a GitHub issue.',
		url: appConfig.help.githubIssues
	}
] satisfies THelpFeedbackLink[];

interface THelpFeedbackLink {
	label: string;
	description: string;
	url: string;
}
