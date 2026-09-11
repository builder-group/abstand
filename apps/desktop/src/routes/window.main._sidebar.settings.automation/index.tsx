import { createFileRoute } from '@tanstack/react-router';
import React from 'react';
import {
	Button,
	CheckIcon,
	CopyIcon,
	InlineCode,
	SettingsPage,
	Spinner,
	Switch,
	useToastsCx,
	WorkflowIcon,
	type ToastsCx
} from '@/components';
import { specta } from '@/environment';
import { toTuple } from '@/lib';
import { SettingsGroup, SettingsRow } from '@/modules/settings';

export const Route = createFileRoute('/window/main/_sidebar/settings/automation/')({
	component: RouteComponent
});

function RouteComponent() {
	return (
		<SettingsPage
			title="Automation"
			subtitle="Use Abstand from Terminal, scripts, and agents."
			icon={<WorkflowIcon />}
			iconVariant="info"
		>
			<SettingsGroup title="Command Line">
				<CommandLineToolAutomationRow />
			</SettingsGroup>
		</SettingsPage>
	);
}

const CommandLineToolAutomationRow: React.FC = () => {
	const toastsCx = useToastsCx();
	const isUnmountedRef = React.useRef(false);

	const [status, setStatus] = React.useState<specta.CliInstallStatus | null>(null);
	const [hasStatusLoadError, setHasStatusLoadError] = React.useState(false);
	const [isStatusPending, setIsStatusPending] = React.useState(true);
	const [isUpdating, setIsUpdating] = React.useState(false);

	const isInstalled = status?.state === 'installed';
	const hasConflict = status?.state === 'conflict';

	// MARK: - Actions

	const handleToggle = React.useCallback(
		async (checked: boolean) => {
			setIsUpdating(true);

			try {
				const [isOk, error, status] = toTuple(
					checked ? await specta.commands.installCli() : await specta.commands.uninstallCli()
				);
				if (isUnmountedRef.current) return;
				if (!isOk) {
					toastsCx.add({
						type: 'error',
						title: checked
							? 'Could not install command line tool'
							: 'Could not uninstall command line tool',
						description: error
					});
					return;
				}

				setStatus(status);
				if (checked) {
					toastsCx.add({
						type: 'info',
						title: 'Command line tool installed',
						description: (
							<>
								Run <InlineCode>{status.commandName}</InlineCode> from Terminal or agents. If it is
								not found, add <InlineCode>{status.binDir}</InlineCode> to PATH.
							</>
						),
						timeout: 0,
						data: { action: <CopyCliPathSetupCommandAction status={status} toastsCx={toastsCx} /> }
					});
				}
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
				const [isOk, error, status] = toTuple(await specta.commands.getCliStatus());
				if (isUnmountedRef.current) return;
				if (!isOk) {
					setHasStatusLoadError(true);
					toastsCx.add({
						type: 'error',
						title: 'Could not load command line tool status',
						description: error
					});
					return;
				}

				setHasStatusLoadError(false);
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

	const description = getCliDescription(status, hasStatusLoadError);

	return (
		<SettingsRow
			label="Command line tool"
			description={description.content}
			descriptionVariant={description.variant}
		>
			{status != null ? (
				<Switch
					checked={isInstalled}
					disabled={isStatusPending || isUpdating || hasConflict}
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

function getCliDescription(
	status: specta.CliInstallStatus | null,
	hasStatusLoadError: boolean
): TSettingsRowDescription {
	if (hasStatusLoadError) {
		return {
			content: 'Could not load command line tool status.',
			variant: 'error'
		};
	}

	if (status == null) {
		return {
			content: 'Checking command line tool status...',
			variant: 'default'
		};
	}

	if (status.state === 'conflict') {
		return {
			content: (
				<>
					Cannot install <InlineCode>{status.commandName}</InlineCode> because another item already
					exists at <InlineCode>{status.binPath}</InlineCode>.
				</>
			),
			variant: 'error'
		};
	}

	return {
		content: (
			<>
				Adds the <InlineCode>{status.commandName}</InlineCode> command.
			</>
		),
		variant: 'default'
	};
}

interface TSettingsRowDescription {
	content: React.ReactNode;
	variant: 'default' | 'warning' | 'error';
}

const CopyCliPathSetupCommandAction: React.FC<TCopyCliPathSetupCommandActionProps> = (props) => {
	const { status, toastsCx } = props;
	const [isCopied, setIsCopied] = React.useState(false);
	const resetCopiedTimeoutRef = React.useRef<number | null>(null);

	const handleCopySetupInstructions = React.useCallback(async () => {
		try {
			await navigator.clipboard.writeText(getCliSetupInstructions(status));
			setIsCopied(true);
			if (resetCopiedTimeoutRef.current != null) {
				window.clearTimeout(resetCopiedTimeoutRef.current);
			}
			resetCopiedTimeoutRef.current = window.setTimeout(() => {
				setIsCopied(false);
				resetCopiedTimeoutRef.current = null;
			}, 1800);
		} catch (error) {
			toastsCx.add({
				type: 'error',
				title: 'Could not copy setup instructions',
				description: String(error)
			});
		}
	}, [status, toastsCx]);

	React.useEffect(() => {
		return () => {
			if (resetCopiedTimeoutRef.current != null) {
				window.clearTimeout(resetCopiedTimeoutRef.current);
			}
		};
	}, []);

	return (
		<Button
			type="button"
			variant="soft"
			size="sm"
			onClick={() => void handleCopySetupInstructions()}
		>
			{isCopied ? <CheckIcon /> : <CopyIcon />}
			{isCopied ? 'Copied' : 'Copy setup instructions'}
		</Button>
	);
};

interface TCopyCliPathSetupCommandActionProps {
	status: specta.CliInstallStatus;
	toastsCx: ToastsCx;
}

function getCliSetupInstructions(status: specta.CliInstallStatus) {
	return [
		'Set up the Abstand command line tool for this shell or agent environment.',
		'',
		`Command: ${status.commandName}`,
		`Installed at: ${status.binPath}`,
		`Required PATH directory: ${status.binDir}`,
		'',
		'Make sure the PATH directory is available before running the command.',
		'For zsh on macOS, add this line to ~/.zprofile if it is missing:',
		`export PATH="${status.binDir}:$PATH"`,
		'',
		`After setup, verify with: ${status.commandName} help`
	].join('\n');
}
