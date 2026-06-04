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
				description="Reveal the current app log file in Finder."
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
				<SettingsRow
					label="Status"
					variant="compact"
					className="group/recovery-agent-status"
					contentClassName="gap-0 transition-[gap] group-focus-within/recovery-agent-status:gap-2 group-hover/recovery-agent-status:gap-2"
				>
					<Badge variant={statusDisplay.variant} size="xs">
						{statusDisplay.label}
					</Badge>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						disabled={isStatusPending}
						onClick={handleRefreshStatus}
						aria-label="Refresh recovery agent status"
						title="Refresh recovery agent status"
						className="w-0 shrink-0 overflow-hidden transition-[width] group-focus-within/recovery-agent-status:w-7 group-hover/recovery-agent-status:w-7 focus-visible:w-7"
					>
						<RefreshCwIcon />
					</Button>
				</SettingsRow>
				<RecoveryAgentStatusBooleanRow
					label="Enabled"
					value={status?.isEnabled ?? false}
					isLoading={status == null}
				/>
				<RecoveryAgentStatusBooleanRow
					label="Configured"
					value={status?.isConfigured ?? false}
					isLoading={status == null}
				/>
				<RecoveryAgentStatusBooleanRow
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
		} satisfies TRecoveryAgentStatusDisplay;
	}

	if (status.isEnabled) {
		return {
			label: 'Enabled',
			variant: 'success'
		} satisfies TRecoveryAgentStatusDisplay;
	}

	if (status.isConfigured && !status.isLoaded) {
		return {
			label: 'Needs Repair',
			variant: 'warning'
		} satisfies TRecoveryAgentStatusDisplay;
	}

	if (!status.isConfigured && status.isLoaded) {
		return {
			label: 'Stale',
			variant: 'destructive'
		} satisfies TRecoveryAgentStatusDisplay;
	}

	return {
		label: 'Off',
		variant: 'secondary'
	} satisfies TRecoveryAgentStatusDisplay;
}

interface TRecoveryAgentStatusDisplay {
	label: string;
	variant: React.ComponentProps<typeof Badge>['variant'];
}

const RecoveryAgentStatusBooleanRow: React.FC<TRecoveryAgentStatusBooleanRowProps> = (props) => {
	const { label, value, isLoading } = props;

	return (
		<SettingsRow label={label} variant="compact">
			<Badge variant={value ? 'success' : 'secondary'} size="xs">
				{isLoading ? 'Loading' : value ? 'Yes' : 'No'}
			</Badge>
		</SettingsRow>
	);
};

interface TRecoveryAgentStatusBooleanRowProps {
	label: string;
	value: boolean;
	isLoading: boolean;
}
