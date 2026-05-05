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
import { CatalogIconPeek, useCatalogPicker, type TCatalogItem } from '@/modules/catalog';
import { SettingsGroup, SettingsRow, SettingsRowFrame } from '@/modules/settings';
import { useNewIntentionCx } from '../new';

export const BlockModeCard: React.FC = () => {
	const cx = useNewIntentionCx();

	const blockMode = useFeatureState(cx.$blockForm.fields.blockMode);
	const [isModeExpanded, setIsModeExpanded] = React.useState(false);
	const currentMode = React.useMemo(
		() =>
			BLOCK_MODE_OPTIONS.find((mode) => mode.value === blockMode) ??
			(BLOCK_MODE_OPTIONS[0] as TBlockModeOption),
		[blockMode]
	);

	const enforcementMode = useFeatureState(cx.$blockForm.fields.enforcementMode);
	const [isEnforcementExpanded, setIsEnforcementExpanded] = React.useState(false);
	const currentEnforcementMode = React.useMemo(
		() =>
			ENFORCEMENT_MODE_OPTIONS.find((mode) => mode.value === enforcementMode) ??
			(ENFORCEMENT_MODE_OPTIONS[1] as TEnforcementModeOption),
		[enforcementMode]
	);

	const selectedTargets = useCompute(
		cx.$blockForm.fields.selectedTargets,
		({ value }) => value ?? []
	);
	const isTargetsSelectable = blockMode !== 'blockAll';
	const targetsLabel = React.useMemo(() => {
		if (!isTargetsSelectable) {
			return 'All apps & websites';
		}
		if (selectedTargets.length > 0) {
			return `${selectedTargets.length} selected`;
		}
		return 'None';
	}, [isTargetsSelectable, selectedTargets]);
	const targetsDescription = React.useMemo(() => {
		switch (blockMode) {
			case 'blockList':
				return 'Choose which apps and websites this intention blocks.';
			case 'allowList':
				return 'Choose what stays available while everything else is blocked.';
			case 'blockAll':
				return undefined;
		}
		return undefined;
	}, [blockMode]);

	const {
		open: openPicker,
		Dialog: PickerDialog,
		cx: catalogPickerCx
	} = useCatalogPicker({
		onConfirm: React.useCallback(
			(items: TCatalogItem[]) => {
				cx.$blockForm.fields.selectedTargets.set(items);
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

	const handleSelectEnforcementMode = React.useCallback(
		(value: specta.IntentionEnforcementMode) => {
			cx.$blockForm.fields.enforcementMode.set(value);
			setIsEnforcementExpanded(false);
		},
		[cx]
	);

	const handleOpenTargets = React.useCallback(() => {
		openPicker(selectedTargets);
	}, [openPicker, selectedTargets]);

	const handleToggleModeExpanded = React.useCallback(() => {
		setIsModeExpanded((value) => !value);
	}, []);

	const handleToggleEnforcementExpanded = React.useCallback(() => {
		setIsEnforcementExpanded((value) => !value);
	}, []);

	// MARK: - UI

	return (
		<>
			<SettingsGroup title="Block">
				<SettingsRow
					label="Mode"
					description="Choose the blocking policy for this intention."
					render={<button type="button" onClick={handleToggleModeExpanded} />}
				>
					<span className="text-base-500 text-[13px]">{currentMode.label}</span>
					<ChevronDownIcon
						className={cn(
							'text-base-400 size-3.5 transition-transform',
							isModeExpanded && 'rotate-180'
						)}
					/>
				</SettingsRow>

				{isModeExpanded &&
					BLOCK_MODE_OPTIONS.map((mode) => (
						<SettingsRowFrame
							key={mode.value}
							render={<button type="button" />}
							onClick={() => handleSelectMode(mode.value)}
							className="items-start gap-2.5 pl-5 [--settings-row-separator-left:--spacing(5)]"
						>
							<mode.Icon className="text-base-400 mt-0.5 size-3.5 shrink-0" />
							<div className="flex min-w-0 flex-1 flex-col text-left">
								<span className="text-base-950 text-[13px]">{mode.label}</span>
								<span className="text-base-500 text-xs">{mode.description}</span>
							</div>
							{blockMode === mode.value && (
								<CheckIcon className="text-primary mt-0.5 size-3.5 shrink-0" />
							)}
						</SettingsRowFrame>
					))}

				{isTargetsSelectable ? (
					<SettingsRow
						label="Targets"
						description={targetsDescription}
						render={<button type="button" onClick={handleOpenTargets} />}
					>
						<span
							className={cn(
								'inline-flex items-center gap-1.5 text-[13px]',
								selectedTargets.length > 0 ? 'text-base-500' : 'text-base-400'
							)}
						>
							<CatalogIconPeek items={selectedTargets} cx={catalogPickerCx} />
							{targetsLabel}
						</span>
						<ChevronRightIcon className="text-base-400 size-3.5" />
					</SettingsRow>
				) : (
					<SettingsRow label="Targets" description={targetsDescription}>
						<span className="text-base-500 text-[13px]">{targetsLabel}</span>
					</SettingsRow>
				)}

				<SettingsRow
					label="Enforcement"
					description="Choose how hard this block is to pause or bypass."
					render={<button type="button" onClick={handleToggleEnforcementExpanded} />}
				>
					<span className="text-base-500 text-[13px]">{currentEnforcementMode.label}</span>
					<ChevronDownIcon
						className={cn(
							'text-base-400 size-3.5 transition-transform',
							isEnforcementExpanded && 'rotate-180'
						)}
					/>
				</SettingsRow>

				{isEnforcementExpanded &&
					ENFORCEMENT_MODE_OPTIONS.map((mode) => (
						<SettingsRowFrame
							key={mode.value}
							render={<button type="button" />}
							onClick={() => handleSelectEnforcementMode(mode.value)}
							className="items-start gap-2.5 pl-5 [--settings-row-separator-left:--spacing(5)]"
						>
							<div className="flex min-w-0 flex-1 flex-col text-left">
								<span className="text-base-950 text-[13px]">{mode.label}</span>
								<span className="text-base-500 text-xs">{mode.description}</span>
							</div>
							{enforcementMode === mode.value && (
								<CheckIcon className="text-primary mt-0.5 size-3.5 shrink-0" />
							)}
						</SettingsRowFrame>
					))}
			</SettingsGroup>
			<PickerDialog />
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

const ENFORCEMENT_MODE_OPTIONS = [
	{
		value: 'casual',
		label: 'Casual',
		description: 'Light friction when you want the block to stay easy to pause.'
	},
	{
		value: 'balanced',
		label: 'Balanced',
		description: 'Moderate friction for regular focus sessions.'
	},
	{
		value: 'hardcore',
		label: 'Hardcore',
		description: 'Maximum friction for commitments you do not want to bypass.'
	}
] satisfies TEnforcementModeOption[];

interface TEnforcementModeOption {
	value: specta.IntentionEnforcementMode;
	label: string;
	description: string;
}
