import { createFileRoute } from '@tanstack/react-router';
import { useCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import {
	ArrowUpRightIcon,
	Badge,
	Button,
	CheckIcon,
	ChevronRightIcon,
	CircleCheckIcon,
	CircleSlashIcon,
	HelpPopover,
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
import { appConfig, specta } from '@/environment';
import { useAppInfo } from '@/hooks';
import { openExternalUrl, sleep, toTuple } from '@/lib';
import { useIntentionsCx } from '@/modules/intentions';
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
			<PermissionsSection />
			<StartupRecoverySection />
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
				description="Adjust how large text appears in the app."
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
			<SettingsRow label="Developer" description="Unlock the Developer settings panel.">
				<Switch checked={developerEnabled} onCheckedChange={handleDeveloperToggle} />
			</SettingsRow>
		</SettingsGroup>
	);
};

const PermissionsSection: React.FC = () => {
	const appInfo = useAppInfo();

	if (appInfo.isPending || appInfo.distribution === 'appStore') {
		return null;
	}

	return (
		<SettingsGroup title="Permissions">
			<AccessibilityPermissionRow />
		</SettingsGroup>
	);
};

const AccessibilityPermissionRow: React.FC = () => {
	const toastsCx = useToastsCx();
	const isUnmountedRef = React.useRef(false);

	const [isGranted, setIsGranted] = React.useState<boolean | null>(null);
	const [isStatusPending, setIsStatusPending] = React.useState(true);

	// MARK: - Actions

	const loadStatus = React.useCallback(async () => {
		const isGranted = await specta.commands.isAccessibilityPermissionGranted();
		if (isUnmountedRef.current) return;

		setIsGranted(isGranted);
		setIsStatusPending(false);
	}, []);

	const handleOpenSettings = React.useCallback(async () => {
		const [isOpenOk, openErr] = toTuple(
			await specta.commands.openAccessibilityPermissionSettings()
		);
		if (!isOpenOk) {
			toastsCx.add({
				type: 'error',
				title: 'Could not open Accessibility settings',
				description: openErr
			});
		}
	}, [toastsCx]);

	// MARK: - Effects

	React.useEffect(() => {
		isUnmountedRef.current = false;

		(async () => {
			const isGranted = await specta.commands.isAccessibilityPermissionGranted();
			if (isUnmountedRef.current) return;

			setIsGranted(isGranted);
			setIsStatusPending(false);
		})();

		// Re-check after returning from System Settings
		window.addEventListener('focus', loadStatus);

		return () => {
			isUnmountedRef.current = true;
			window.removeEventListener('focus', loadStatus);
		};
	}, [loadStatus]);

	// MARK: - UI

	return (
		<SettingsRow
			label="Accessibility"
			description="Required to detect active windows."
			render={<button type="button" onClick={handleOpenSettings} />}
		>
			{isGranted != null ? (
				<PermissionStatusBadge isGranted={isGranted} />
			) : isStatusPending ? (
				<Spinner size="sm" />
			) : (
				<Badge variant="secondary">Unknown</Badge>
			)}
			<ChevronRightIcon className="text-base-400" />
		</SettingsRow>
	);
};

const PermissionStatusBadge: React.FC<TPermissionStatusBadgeProps> = (props) => {
	const { isGranted } = props;

	if (isGranted) {
		return (
			<Badge variant="success">
				<CheckIcon />
				Granted
			</Badge>
		);
	}

	return (
		<Badge variant="warning">
			<CircleSlashIcon />
			Required
		</Badge>
	);
};

interface TPermissionStatusBadgeProps {
	isGranted: boolean;
}

const StartupRecoverySection: React.FC = () => {
	return (
		<SettingsGroup title="Startup & Recovery">
			<RecoveryAgentStartupRecoveryRow />
			<LaunchAtLoginStartupRecoveryRow />
		</SettingsGroup>
	);
};

const RecoveryAgentStartupRecoveryRow: React.FC = () => {
	const toastsCx = useToastsCx();
	const intentionsCx = useIntentionsCx();
	const isUnmountedRef = React.useRef(false);

	const hasActiveStrictBlockSession = useFeatureState(intentionsCx.$hasActiveStrictBlockSession);

	const [status, setStatus] = React.useState<specta.RecoveryAgentStatus | null>(null);
	const [isStatusPending, setIsStatusPending] = React.useState(true);
	const [isUpdating, setIsUpdating] = React.useState(false);

	const isEnabled = status?.isEnabled ?? false;
	const isPreventedByActiveStrictBlock = isEnabled && hasActiveStrictBlockSession;

	// MARK: - Actions

	const handleToggle = React.useCallback(
		async (checked: boolean) => {
			setIsUpdating(true);

			try {
				const [isOk, error, status] = toTuple(
					checked
						? await specta.commands.installRecoveryAgent()
						: await specta.commands.uninstallRecoveryAgent()
				);
				if (isUnmountedRef.current) return;
				if (!isOk) {
					toastsCx.add({
						type: 'error',
						title: checked ? 'Could not enable recovery' : 'Could not disable recovery',
						description: error
					});
					return;
				}

				setStatus(status);
			} finally {
				if (!isUnmountedRef.current) {
					setIsUpdating(false);
				}
			}
		},
		[toastsCx]
	);

	// MARK: - Effects

	React.useEffect(() => {
		isUnmountedRef.current = false;

		(async () => {
			try {
				const [isOk, error, status] = toTuple(await specta.commands.getRecoveryAgentStatus());
				if (isUnmountedRef.current) return;
				if (!isOk) {
					toastsCx.add({
						type: 'error',
						title: 'Could not load recovery status',
						description: error
					});
					return;
				}

				setStatus(status);
			} finally {
				if (!isUnmountedRef.current) {
					setIsStatusPending(false);
				}
			}
		})();

		return () => {
			isUnmountedRef.current = true;
		};
	}, [toastsCx]);

	// MARK: - UI

	return (
		<SettingsRow
			label="Reopen Abstand during Strict Enforcement"
			labelAccessory={
				<HelpPopover description="A background process that watches Abstand and relaunches it automatically if it closes unexpectedly." />
			}
			description={getRecoveryAgentDescription(status, hasActiveStrictBlockSession)}
		>
			{status != null ? (
				<Switch
					checked={isEnabled}
					disabled={isStatusPending || isUpdating || isPreventedByActiveStrictBlock}
					onCheckedChange={handleToggle}
				/>
			) : isStatusPending ? (
				<Spinner size="sm" />
			) : (
				<Switch checked={false} disabled />
			)}
		</SettingsRow>
	);
};

function getRecoveryAgentDescription(
	status: specta.RecoveryAgentStatus | null,
	hasActiveStrictBlockSession: boolean
) {
	if (status == null) {
		return 'Checking recovery status...';
	}

	if (status.isEnabled && hasActiveStrictBlockSession) {
		return 'Abstand will reopen during this Strict Enforcement session. Cannot be turned off until it ends.';
	}

	if (status.isConfigured && !status.isLoaded) {
		return 'Recovery stopped working. Turn this on again before your next Strict Enforcement session.';
	}

	return 'Automatically relaunch Abstand if it closes during a Strict Enforcement session.';
}

const LaunchAtLoginStartupRecoveryRow: React.FC = () => {
	const toastsCx = useToastsCx();
	const intentionsCx = useIntentionsCx();
	const isUnmountedRef = React.useRef(false);

	const hasActiveStrictBlockSession = useFeatureState(intentionsCx.$hasActiveStrictBlockSession);

	const [status, setStatus] = React.useState<specta.LaunchAtLoginStatus | null>(null);
	const [isStatusPending, setIsStatusPending] = React.useState(true);
	const [isUpdating, setIsUpdating] = React.useState(false);

	const isEnabled = status?.isEnabled ?? false;
	const isPreventedByActiveStrictBlock = isEnabled && hasActiveStrictBlockSession;

	// MARK: - Actions

	const handleToggle = React.useCallback(
		async (checked: boolean) => {
			setIsUpdating(true);

			try {
				const [isOk, error, status] = toTuple(
					checked
						? await specta.commands.enableLaunchAtLogin()
						: await specta.commands.disableLaunchAtLogin()
				);
				if (isUnmountedRef.current) return;
				if (!isOk) {
					toastsCx.add({
						type: 'error',
						title: checked
							? 'Could not enable launch at login'
							: 'Could not disable launch at login',
						description: error
					});
					return;
				}

				setStatus(status);
			} finally {
				if (!isUnmountedRef.current) {
					setIsUpdating(false);
				}
			}
		},
		[toastsCx]
	);

	// MARK: - Effects

	React.useEffect(() => {
		isUnmountedRef.current = false;

		(async () => {
			try {
				const [isOk, error, status] = toTuple(await specta.commands.getLaunchAtLoginStatus());
				if (isUnmountedRef.current) return;
				if (!isOk) {
					toastsCx.add({
						type: 'error',
						title: 'Could not load launch at login status',
						description: error
					});
					return;
				}

				setStatus(status);
			} finally {
				if (!isUnmountedRef.current) {
					setIsStatusPending(false);
				}
			}
		})();

		return () => {
			isUnmountedRef.current = true;
		};
	}, [toastsCx]);

	// MARK: - UI

	return (
		<SettingsRow
			label="Open Abstand at login"
			description={getLaunchAtLoginDescription(status, hasActiveStrictBlockSession)}
		>
			{status != null ? (
				<Switch
					checked={isEnabled}
					disabled={isStatusPending || isUpdating || isPreventedByActiveStrictBlock}
					onCheckedChange={handleToggle}
				/>
			) : isStatusPending ? (
				<Spinner size="sm" />
			) : (
				<Switch checked={false} disabled />
			)}
		</SettingsRow>
	);
};

function getLaunchAtLoginDescription(
	status: specta.LaunchAtLoginStatus | null,
	hasActiveStrictBlockSession: boolean
) {
	if (status == null) {
		return 'Checking status...';
	}

	if (status.isEnabled && hasActiveStrictBlockSession) {
		return 'Abstand opens at login during this Strict Enforcement session. Cannot be turned off until it ends.';
	}

	return 'Launches in the background when you sign in.';
}

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
					<ArrowUpRightIcon aria-hidden className="text-base-400" />
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
		description: 'Get help by email.',
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
