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
import { SettingsGroup, SettingsRow } from '@/modules/settings';
import { useNewIntentionCx } from '../new';

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

	const handleOpenTargets = React.useCallback(() => {
		openPicker(selectedTargets);
	}, [openPicker, selectedTargets]);

	const handleToggleModeExpanded = React.useCallback(() => {
		setIsModeExpanded((value) => !value);
	}, []);

	// MARK: - UI

	return (
		<>
			<SettingsGroup title="Block">
				<SettingsRow
					label="Mode"
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
						<button
							key={mode.value}
							type="button"
							onClick={() => handleSelectMode(mode.value)}
							className="hover:bg-base-950/6 active:bg-base-950/10 flex w-full cursor-default items-start gap-2.5 px-2.5 py-2"
						>
							<mode.Icon className="text-base-400 mt-0.5 size-3.5 shrink-0" />
							<div className="flex min-w-0 flex-1 flex-col text-left">
								<span className="text-base-950 text-[13px]">{mode.label}</span>
								<span className="text-base-500 text-xs">{mode.description}</span>
							</div>
							{blockMode === mode.value && (
								<CheckIcon className="text-primary mt-0.5 size-3.5 shrink-0" />
							)}
						</button>
					))}

				{isTargetsSelectable ? (
					<SettingsRow
						label="Targets"
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
					<SettingsRow label="Targets">
						<span className="text-base-500 text-[13px]">{targetsLabel}</span>
					</SettingsRow>
				)}
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
