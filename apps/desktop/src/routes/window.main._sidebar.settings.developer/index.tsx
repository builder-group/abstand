import { createFileRoute, Link } from '@tanstack/react-router';
import React from 'react';
import {
	Badge,
	Button,
	ChevronRightIcon,
	CodeXmlIcon,
	FolderOpenIcon,
	RefreshCwIcon,
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
	return (
		<SettingsPage
			title="Developer"
			subtitle="Tools and settings for development."
			icon={<CodeXmlIcon />}
			iconVariant="secondary"
		>
			<AppSection />
			<DiagnosticsSection />
			<RecoveryAgentDiagnosticsSection />
			<LaunchAtLoginDiagnosticsSection />
			<CommandLineToolDiagnosticsSection />
			<SettingsGroup title="Interface">
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

const AppSection: React.FC = () => {
	const toastsCx = useToastsCx();

	// MARK: - Actions

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
		<SettingsGroup title="App">
			<SettingsRow
				label="Data Directory"
				description="Open app data folder in Finder."
				render={<button onClick={handleOpenDataDirectory} />}
			>
				<FolderOpenIcon className="text-base-400 size-4" />
				<ChevronRightIcon className="text-base-400" />
			</SettingsRow>
		</SettingsGroup>
	);
};

const DiagnosticsSection: React.FC = () => {
	const toastsCx = useToastsCx();

	// MARK: - Actions

	const handleRevealLogFile = React.useCallback(async () => {
		const [isRevealOk, revealErr] = toTuple(await specta.commands.revealLogFile());
		if (!isRevealOk) {
			toastsCx.add({
				type: 'error',
				title: 'Could not show log file',
				description: revealErr
			});
		}
	}, [toastsCx]);

	// MARK: - UI

	return (
		<SettingsGroup title="Diagnostics">
			<SettingsRow
				label="Log File"
				description="Reveal the app log file in Finder."
				render={<button onClick={handleRevealLogFile} />}
			>
				<FolderOpenIcon className="text-base-400 size-4" />
				<ChevronRightIcon className="text-base-400" />
			</SettingsRow>
		</SettingsGroup>
	);
};

const RecoveryAgentDiagnosticsSection: React.FC = () => {
	const toastsCx = useToastsCx();
	const isUnmountedRef = React.useRef(false);

	const [status, setStatus] = React.useState<specta.RecoveryAgentStatus | null>(null);
	const [isStatusPending, setIsStatusPending] = React.useState(true);
	const statusDisplay = getRecoveryAgentStatusDisplay(status);

	// MARK: - Actions

	const handleRefreshStatus = React.useCallback(async () => {
		setIsStatusPending(true);

		try {
			const [isOk, error, status] = toTuple(await specta.commands.getRecoveryAgentStatus());
			if (isUnmountedRef.current) return;
			if (!isOk) {
				toastsCx.add({
					type: 'error',
					title: 'Could not load recovery agent status',
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
	}, [toastsCx]);

	const handleRevealPlist = React.useCallback(async () => {
		const [isRevealOk, revealErr] = toTuple(await specta.commands.revealRecoveryAgentPlist());
		if (!isRevealOk) {
			toastsCx.add({
				type: 'error',
				title: 'Could not show recovery agent plist',
				description: revealErr
			});
		}
	}, [toastsCx]);

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
						title: 'Could not load recovery agent status',
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
		<div className="space-y-2.5">
			<SettingsGroup title="Recovery Agent">
				<SettingsRow
					label="Plist"
					description="Reveal the LaunchAgent plist in Finder."
					render={<button onClick={handleRevealPlist} />}
				>
					<FolderOpenIcon className="text-base-400 size-4" />
					<ChevronRightIcon className="text-base-400" />
				</SettingsRow>
			</SettingsGroup>
			<SettingsGroup>
				<DiagnosticsStatusRow
					label="Status"
					display={statusDisplay}
					isPending={isStatusPending}
					onRefresh={handleRefreshStatus}
					refreshLabel="Refresh recovery agent status"
				/>
				<StatusBooleanRow
					label="Enabled"
					value={status?.isEnabled ?? false}
					isLoading={status == null}
				/>
				<StatusBooleanRow
					label="Configured"
					value={status?.isConfigured ?? false}
					isLoading={status == null}
				/>
				<StatusBooleanRow
					label="Loaded"
					value={status?.isLoaded ?? false}
					isLoading={status == null}
				/>
			</SettingsGroup>
		</div>
	);
};

function getRecoveryAgentStatusDisplay(status: specta.RecoveryAgentStatus | null) {
	if (status == null) {
		return {
			label: 'Loading',
			variant: 'secondary'
		} satisfies TStatusDisplay;
	}

	if (status.isEnabled) {
		return {
			label: 'Enabled',
			variant: 'success'
		} satisfies TStatusDisplay;
	}

	if (status.isConfigured && !status.isLoaded) {
		return {
			label: 'Needs Repair',
			variant: 'warning'
		} satisfies TStatusDisplay;
	}

	if (!status.isConfigured && status.isLoaded) {
		return {
			label: 'Stale',
			variant: 'destructive'
		} satisfies TStatusDisplay;
	}

	return {
		label: 'Off',
		variant: 'secondary'
	} satisfies TStatusDisplay;
}

const LaunchAtLoginDiagnosticsSection: React.FC = () => {
	const toastsCx = useToastsCx();
	const isUnmountedRef = React.useRef(false);

	const [status, setStatus] = React.useState<specta.LaunchAtLoginStatus | null>(null);
	const [isStatusPending, setIsStatusPending] = React.useState(true);
	const statusDisplay = getLaunchAtLoginStatusDisplay(status);

	// MARK: - Actions

	const handleRefreshStatus = React.useCallback(async () => {
		setIsStatusPending(true);

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
	}, [toastsCx]);

	const handleRevealPlist = React.useCallback(async () => {
		const [isRevealOk, revealErr] = toTuple(await specta.commands.revealLaunchAtLoginPlist());
		if (!isRevealOk) {
			toastsCx.add({
				type: 'error',
				title: 'Could not show launch at login plist',
				description: revealErr
			});
		}
	}, [toastsCx]);

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
		<div className="space-y-2.5">
			<SettingsGroup title="Launch at Login">
				<SettingsRow
					label="Plist"
					description="Reveal the LaunchAgent plist in Finder."
					render={<button onClick={handleRevealPlist} />}
				>
					<FolderOpenIcon className="text-base-400 size-4" />
					<ChevronRightIcon className="text-base-400" />
				</SettingsRow>
			</SettingsGroup>
			<SettingsGroup>
				<DiagnosticsStatusRow
					label="Status"
					display={statusDisplay}
					isPending={isStatusPending}
					onRefresh={handleRefreshStatus}
					refreshLabel="Refresh launch at login status"
				/>
				<StatusBooleanRow
					label="Enabled"
					value={status?.isEnabled ?? false}
					isLoading={status == null}
				/>
			</SettingsGroup>
		</div>
	);
};

function getLaunchAtLoginStatusDisplay(status: specta.LaunchAtLoginStatus | null) {
	if (status == null) {
		return {
			label: 'Loading',
			variant: 'secondary'
		} satisfies TStatusDisplay;
	}

	if (status.isEnabled) {
		return {
			label: 'Enabled',
			variant: 'success'
		} satisfies TStatusDisplay;
	}

	return {
		label: 'Off',
		variant: 'secondary'
	} satisfies TStatusDisplay;
}

const CommandLineToolDiagnosticsSection: React.FC = () => {
	const toastsCx = useToastsCx();
	const isUnmountedRef = React.useRef(false);

	const [status, setStatus] = React.useState<specta.CliInstallStatus | null>(null);
	const [isStatusPending, setIsStatusPending] = React.useState(true);
	const statusDisplay = getCliStatusDisplay(status);

	// MARK: - Actions

	const handleRefreshStatus = React.useCallback(async () => {
		setIsStatusPending(true);

		try {
			const [isOk, error, status] = toTuple(await specta.commands.getCliStatus());
			if (isUnmountedRef.current) return;
			if (!isOk) {
				toastsCx.add({
					type: 'error',
					title: 'Could not load command line tool status',
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
	}, [toastsCx]);

	const handleRevealBinary = React.useCallback(async () => {
		const [isRevealOk, revealErr] = toTuple(await specta.commands.revealCliBinary());
		if (!isRevealOk) {
			toastsCx.add({
				type: 'error',
				title: 'Could not show command line tool',
				description: revealErr
			});
		}
	}, [toastsCx]);

	// MARK: - Effects

	React.useEffect(() => {
		isUnmountedRef.current = false;

		(async () => {
			try {
				const [isOk, error, status] = toTuple(await specta.commands.getCliStatus());
				if (isUnmountedRef.current) return;
				if (!isOk) {
					toastsCx.add({
						type: 'error',
						title: 'Could not load command line tool status',
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
		<div className="space-y-2.5">
			<SettingsGroup title="Command Line Tool">
				<SettingsRow
					label="Binary"
					description="Reveal the command line tool symlink in Finder."
					render={<button onClick={handleRevealBinary} />}
				>
					<FolderOpenIcon className="text-base-400 size-4" />
					<ChevronRightIcon className="text-base-400" />
				</SettingsRow>
			</SettingsGroup>
			<SettingsGroup>
				<DiagnosticsStatusRow
					label="Status"
					display={statusDisplay}
					isPending={isStatusPending}
					onRefresh={handleRefreshStatus}
					refreshLabel="Refresh command line tool status"
				/>
				<StatusTextRow label="Command" value={status?.commandName ?? null} />
				<StatusTextRow label="Binary" value={status?.binPath ?? null} />
				<StatusTextRow label="PATH Directory" value={status?.binDir ?? null} />
			</SettingsGroup>
		</div>
	);
};

function getCliStatusDisplay(status: specta.CliInstallStatus | null) {
	if (status == null) {
		return {
			label: 'Loading',
			variant: 'secondary'
		} satisfies TStatusDisplay;
	}

	if (status.state === 'installed') {
		return {
			label: 'Installed',
			variant: 'success'
		} satisfies TStatusDisplay;
	}

	if (status.state === 'conflict') {
		return {
			label: 'Conflict',
			variant: 'destructive'
		} satisfies TStatusDisplay;
	}

	return {
		label: 'Not Installed',
		variant: 'secondary'
	} satisfies TStatusDisplay;
}

const StatusBooleanRow: React.FC<TStatusBooleanRowProps> = (props) => {
	const { label, value, isLoading } = props;

	return (
		<SettingsRow label={label} variant="compact">
			<Badge variant={value ? 'success' : 'secondary'}>
				{isLoading ? 'Loading' : value ? 'Yes' : 'No'}
			</Badge>
		</SettingsRow>
	);
};

interface TStatusBooleanRowProps {
	label: string;
	value: boolean;
	isLoading: boolean;
}

const StatusTextRow: React.FC<TStatusTextRowProps> = (props) => {
	const { label, value } = props;

	return (
		<SettingsRow label={label} variant="compact" contentClassName="min-w-0">
			<span
				className="text-base-500 max-w-80 truncate font-mono text-xs"
				title={value ?? undefined}
			>
				{value ?? 'Loading'}
			</span>
		</SettingsRow>
	);
};

interface TStatusTextRowProps {
	label: string;
	value: string | null;
}

const DiagnosticsStatusRow: React.FC<TDiagnosticsStatusRowProps> = (props) => {
	const { label, display, isPending, onRefresh, refreshLabel } = props;

	return (
		<SettingsRow
			label={label}
			variant="compact"
			className="group/diagnostics-status"
			contentClassName="gap-0 transition-[gap] group-focus-within/diagnostics-status:gap-2 group-hover/diagnostics-status:gap-2"
		>
			<Badge variant={display.variant}>{display.label}</Badge>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				disabled={isPending}
				onClick={onRefresh}
				aria-label={refreshLabel}
				title={refreshLabel}
				className="w-0 shrink-0 overflow-hidden transition-[width] group-focus-within/diagnostics-status:w-7 group-hover/diagnostics-status:w-7 focus-visible:w-7"
			>
				<RefreshCwIcon />
			</Button>
		</SettingsRow>
	);
};

interface TDiagnosticsStatusRowProps {
	label: string;
	display: TStatusDisplay;
	isPending: boolean;
	onRefresh: () => void;
	refreshLabel: string;
}

interface TStatusDisplay {
	label: string;
	variant: React.ComponentProps<typeof Badge>['variant'];
}
