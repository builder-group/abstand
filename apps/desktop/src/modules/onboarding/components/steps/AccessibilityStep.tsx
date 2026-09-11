import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { ArrowUpRightIcon, Badge, ScanSearchIcon, Spinner, useToastsCx } from '@/components';
import { PermissionStatusBadge } from '@/modules/settings';
import type { OnboardingCx } from '../../OnboardingCx';
import { OnboardingPanel, type TOnboardingPanelAction } from '../OnboardingPanel';

export const AccessibilityStep: React.FC<TAccessibilityStepProps> = (props) => {
	const { cx } = props;
	const toastsCx = useToastsCx();

	const isGranted = useFeatureState(cx.$isAccessibilityGranted);
	const isStatusPending = useFeatureState(cx.$isAccessibilityStatusPending);
	const isOpeningSettings = useFeatureState(cx.$isOpeningAccessibilitySettings);
	const isRestartingApp = useFeatureState(cx.$isRestartingApp);
	const isRestartRequired = useFeatureState(cx.$isAccessibilityRestartRequired);

	const needsRestart = isGranted === true && isRestartRequired;
	const canContinue = isGranted === true && !needsRestart;
	const canSkip = !canContinue;

	// MARK: - Actions

	const handleOpenSettings = React.useCallback(async () => {
		const [isOpenOk, openErr] = await cx.openAccessibilitySettings();
		if (!isOpenOk) {
			toastsCx.add({
				type: 'error',
				title: 'Could not open Accessibility settings',
				description: openErr
			});
		}
	}, [cx, toastsCx]);

	const handleRestart = React.useCallback(async () => {
		const [isRestartOk, restartErr] = await cx.restartApp();
		if (!isRestartOk) {
			toastsCx.add({
				type: 'error',
				title: 'Could not restart Abstand',
				description: restartErr
			});
		}
	}, [cx, toastsCx]);

	// MARK: - UI

	return (
		<OnboardingPanel
			icon={<ScanSearchIcon />}
			step="accessibility"
			artworkTone="green"
			title="Let Abstand see where your attention goes."
			description="To hold your boundaries, Abstand needs macOS Accessibility access. It uses this to detect the active app or website and apply Blocks at the right moment."
			body={
				<AccessibilityPermissionCard
					isGranted={isGranted}
					isPending={isStatusPending}
					needsRestart={needsRestart}
				/>
			}
			primaryAction={getPrimaryAction({
				canContinue,
				isOpeningSettings,
				isRestartingApp,
				needsRestart,
				onContinue: () => cx.goToStep('firstBlock'),
				onOpenSettings: handleOpenSettings,
				onRestart: handleRestart
			})}
			secondaryAction={
				canSkip ? { children: 'Skip', onPress: () => cx.skipAccessibility() } : undefined
			}
			onBack={() => cx.goBack()}
		/>
	);
};

interface TAccessibilityStepProps {
	cx: OnboardingCx;
}

function getPrimaryAction(options: TGetPrimaryActionOptions): TOnboardingPanelAction {
	const {
		canContinue,
		needsRestart,
		isOpeningSettings,
		isRestartingApp,
		onContinue,
		onOpenSettings,
		onRestart
	} = options;

	if (needsRestart) {
		return {
			children: (
				<>
					{isRestartingApp && <Spinner size="sm" tone="current" />}
					Restart
				</>
			),
			disabled: isRestartingApp || isOpeningSettings,
			onPress: () => void onRestart()
		};
	}

	if (canContinue) {
		return {
			children: 'Continue',
			onPress: onContinue
		};
	}

	return {
		children: (
			<>
				{isOpeningSettings && <Spinner size="sm" tone="current" />}
				Open Settings
				{!isOpeningSettings && <ArrowUpRightIcon />}
			</>
		),
		disabled: isOpeningSettings || isRestartingApp,
		onPress: () => void onOpenSettings()
	};
}

interface TGetPrimaryActionOptions {
	canContinue: boolean;
	needsRestart: boolean;
	isOpeningSettings: boolean;
	isRestartingApp: boolean;
	onContinue: () => void;
	onOpenSettings: () => Promise<void>;
	onRestart: () => Promise<void>;
}

const AccessibilityPermissionCard: React.FC<TAccessibilityPermissionCardProps> = (props) => {
	const { isGranted, isPending, needsRestart } = props;

	return (
		<div className="border-base-100 bg-base-50 flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5">
			<div className="min-w-0">
				<p className="text-base-950 text-sm font-medium">Accessibility</p>
				<p className="text-base-500 text-xs">
					Required to detect active windows and browser sites.
				</p>
			</div>
			{isGranted != null ? (
				needsRestart ? (
					<Badge variant="secondary">Restart required</Badge>
				) : (
					<PermissionStatusBadge isGranted={isGranted} />
				)
			) : isPending ? (
				<Spinner size="sm" className="mr-2" />
			) : (
				<Badge variant="secondary">Unknown</Badge>
			)}
		</div>
	);
};

interface TAccessibilityPermissionCardProps {
	isGranted: boolean | null;
	isPending: boolean;
	needsRestart: boolean;
}
