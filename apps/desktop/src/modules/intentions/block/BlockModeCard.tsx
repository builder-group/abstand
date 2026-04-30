import { useCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import {
	CheckIcon,
	ChevronDownIcon,
	ChevronRightIcon,
	MonitorIcon,
	ShieldCheckIcon,
	ShieldIcon
} from '@/components';
import { type specta } from '@/environment';
import { cn } from '@/lib';
import { SettingsGroup } from '@/modules/settings';
import { useNewIntentionCx } from '../new';
import { type TBlockTarget } from './block-target';
import { useBlockTargetsDialog } from './BlockTargetsDialog';

export const BlockModeCard: React.FC = () => {
	const cx = useNewIntentionCx();
	const blockMode = useFeatureState(cx.$blockForm.fields.blockMode);
	const selectedTargets = useCompute(
		cx.$blockForm.fields.selectedTargets,
		({ value }) => value ?? []
	);

	const [isModeExpanded, setIsModeExpanded] = React.useState(false);
	const isTargetsSelectable = blockMode !== 'blockAll';
	const currentMode = React.useMemo(
		() =>
			BLOCK_MODE_OPTIONS.find((mode) => mode.value === blockMode) ??
			(BLOCK_MODE_OPTIONS[0] as TBlockModeOption),
		[blockMode]
	);
	const targetsLabel = React.useMemo(() => {
		if (!isTargetsSelectable) {
			return 'All';
		}
		if (selectedTargets.length > 0) {
			return `${selectedTargets.length} selected`;
		}
		return 'None';
	}, [isTargetsSelectable, selectedTargets]);

	const { open: openTargetsDialog, Modal: TargetsDialog } = useBlockTargetsDialog({
		onConfirm: React.useCallback(
			(targets: TBlockTarget[]) => {
				cx.$blockForm.fields.selectedTargets.set(targets);
			},
			[cx]
		)
	});

	// MARK: - Actions

	const handleSelectMode = React.useCallback(
		(value: specta.IntentionBlockMode) => {
			cx.$blockForm.fields.blockMode.set(value);
			setIsModeExpanded(false);
		},
		[cx]
	);

	const handleOpenTargets = React.useCallback(() => {
		openTargetsDialog(selectedTargets);
	}, [openTargetsDialog, selectedTargets]);

	// MARK: - UI

	return (
		<>
			<SettingsGroup title="Block">
				<div>
					<button
						type="button"
						onClick={() => setIsModeExpanded((v) => !v)}
						className="hover:bg-base-950/6 active:bg-base-950/10 flex min-h-10 w-full cursor-default items-center justify-between gap-6 px-3.5 py-2.5"
					>
						<span className="text-base-950 text-[13px]">Mode</span>
						<span className="flex items-center gap-2">
							<span className="text-base-500 text-sm">{currentMode.label}</span>
							<ChevronDownIcon
								className={cn(
									'text-base-400 size-4 transition-transform',
									isModeExpanded && 'rotate-180'
								)}
							/>
						</span>
					</button>

					{isModeExpanded && (
						<div>
							{BLOCK_MODE_OPTIONS.map((mode) => (
								<button
									key={mode.value}
									type="button"
									onClick={() => handleSelectMode(mode.value)}
									className="before:bg-base-100 hover:bg-base-950/6 active:bg-base-950/10 relative flex w-full cursor-default items-start gap-3 px-4 py-3 before:absolute before:inset-x-4 before:top-0 before:h-px before:content-['']"
								>
									<mode.Icon className="text-base-400 mt-0.5 size-4 shrink-0" />
									<div className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
										<span className="text-base-950 text-[13px]">{mode.label}</span>
										<span className="text-base-500 text-xs">{mode.description}</span>
									</div>
									{blockMode === mode.value && (
										<CheckIcon className="text-primary mt-0.5 size-4 shrink-0" />
									)}
								</button>
							))}
						</div>
					)}
				</div>

				{isTargetsSelectable ? (
					<button
						type="button"
						onClick={handleOpenTargets}
						className="hover:bg-base-950/6 active:bg-base-950/10 flex min-h-10 w-full cursor-default items-center justify-between gap-6 px-3.5 py-2.5"
					>
						<span className="text-base-950 text-[13px]">Targets</span>
						<span className="flex items-center gap-2">
							<span
								className={cn(
									selectedTargets.length > 0 ? 'text-base-500' : 'text-base-400',
									'text-sm'
								)}
							>
								{targetsLabel}
							</span>
							<ChevronRightIcon className="text-base-400 size-4" />
						</span>
					</button>
				) : (
					<div className="flex min-h-10 items-center justify-between gap-6 px-4 py-2.5">
						<span className="text-base-950 text-sm">Targets</span>
						<span className="text-base-500 text-sm">{targetsLabel}</span>
					</div>
				)}
			</SettingsGroup>
			<TargetsDialog />
		</>
	);
};

const BLOCK_MODE_OPTIONS = [
	{
		value: 'blockList',
		label: 'Block List',
		description: 'Block only the apps and websites you choose.',
		Icon: ShieldIcon
	},
	{
		value: 'allowList',
		label: 'Allow List',
		description: 'Block everything except what you choose.',
		Icon: ShieldCheckIcon
	},
	{
		value: 'blockAll',
		label: 'Block All',
		description: 'Block all apps and websites.',
		Icon: MonitorIcon
	}
] satisfies TBlockModeOption[];

interface TBlockModeOption {
	value: specta.IntentionBlockMode;
	label: string;
	description: string;
	Icon: React.ComponentType<{ className?: string }>;
}
