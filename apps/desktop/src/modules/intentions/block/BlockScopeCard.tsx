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
import { useNewBlockIntentionCx } from './NewBlockIntentionCx';

export const BlockScopeCard: React.FC = () => {
	const cx = useNewBlockIntentionCx();

	const scope = useFeatureState(cx.$form.fields.scope);
	const [isScopeExpanded, setIsScopeExpanded] = React.useState(false);
	const currentScope = React.useMemo(
		() =>
			BLOCK_SCOPE_OPTIONS.find((option) => option.value === scope) ??
			(BLOCK_SCOPE_OPTIONS[0] as TBlockScopeOption),
		[scope]
	);

	const enforcementMode = useFeatureState(cx.$form.fields.enforcementMode);
	const [isEnforcementExpanded, setIsEnforcementExpanded] = React.useState(false);
	const currentEnforcementMode = React.useMemo(
		() =>
			ENFORCEMENT_MODE_OPTIONS.find((mode) => mode.value === enforcementMode) ??
			(ENFORCEMENT_MODE_OPTIONS[1] as TEnforcementModeOption),
		[enforcementMode]
	);

	const selectedTargets = useCompute(cx.$form.fields.selectedTargets, ({ value }) => value ?? []);
	const isTargetsSelectable = scope !== 'wholeDevice';
	const targetsLabel = React.useMemo(() => {
		if (!isTargetsSelectable) {
			return 'Whole device';
		}
		if (selectedTargets.length > 0) {
			return `${selectedTargets.length} selected`;
		}
		return 'None';
	}, [isTargetsSelectable, selectedTargets]);
	const targetsDescription = React.useMemo(() => {
		switch (scope) {
			case 'blockTargets':
				return 'Choose which apps and websites this intention blocks.';
			case 'allowTargets':
				return 'Choose what stays available while everything else is blocked.';
			case 'wholeDevice':
				return undefined;
		}
		return undefined;
	}, [scope]);

	const {
		open: openPicker,
		Dialog: PickerDialog,
		cx: catalogPickerCx
	} = useCatalogPicker({
		onConfirm: React.useCallback(
			(items: TCatalogItem[]) => {
				cx.$form.fields.selectedTargets.set(items);
			},
			[cx]
		)
	});

	// MARK: - Actions

	const handleSelectScope = React.useCallback(
		(value: specta.IntentionBlockScope) => {
			cx.$form.fields.scope.set(value);
			setIsScopeExpanded(false);
		},
		[cx]
	);

	const handleSelectEnforcementMode = React.useCallback(
		(value: specta.IntentionEnforcementMode) => {
			cx.$form.fields.enforcementMode.set(value);
			setIsEnforcementExpanded(false);
		},
		[cx]
	);

	const handleOpenTargets = React.useCallback(() => {
		openPicker(selectedTargets);
	}, [openPicker, selectedTargets]);

	const handleToggleScopeExpanded = React.useCallback(() => {
		setIsScopeExpanded((value) => !value);
	}, []);

	const handleToggleEnforcementExpanded = React.useCallback(() => {
		setIsEnforcementExpanded((value) => !value);
	}, []);

	// MARK: - UI

	return (
		<>
			<SettingsGroup title="Block">
				<SettingsRow
					label="Blocking"
					description="Choose how broadly this intention blocks."
					render={<button type="button" onClick={handleToggleScopeExpanded} />}
				>
					<span className="text-base-500 text-sm">{currentScope.label}</span>
					<ChevronDownIcon
						className={cn('text-base-400 transition-transform', isScopeExpanded && 'rotate-180')}
					/>
				</SettingsRow>

				{isScopeExpanded &&
					BLOCK_SCOPE_OPTIONS.map((scopeOption) => (
						<SettingsRowFrame
							key={scopeOption.value}
							render={<button type="button" />}
							onClick={() => handleSelectScope(scopeOption.value)}
							className="items-start gap-2.5 pl-5 [--settings-row-separator-left:--spacing(5)]"
						>
							<scopeOption.Icon className="text-base-400 mt-0.5 size-4 shrink-0" />
							<div className="flex min-w-0 flex-1 flex-col text-left">
								<span className="text-base-950 text-sm">{scopeOption.label}</span>
								<span className="text-base-500 mt-px text-xs">{scopeOption.description}</span>
							</div>
							{scope === scopeOption.value && (
								<CheckIcon className="text-primary mt-0.5 shrink-0" />
							)}
						</SettingsRowFrame>
					))}

				{isTargetsSelectable ? (
					<SettingsRow
						label="Apps & websites"
						description={targetsDescription}
						render={<button type="button" onClick={handleOpenTargets} />}
					>
						<span
							className={cn(
								'inline-flex items-center gap-1.5 text-sm',
								selectedTargets.length > 0 ? 'text-base-500' : 'text-base-400'
							)}
						>
							<CatalogIconPeek items={selectedTargets} cx={catalogPickerCx} />
							{targetsLabel}
						</span>
						<ChevronRightIcon className="text-base-400" />
					</SettingsRow>
				) : (
					<SettingsRow label="Apps & websites" description={targetsDescription}>
						<span className="text-base-500 text-sm">{targetsLabel}</span>
					</SettingsRow>
				)}

				<SettingsRow
					label="Enforcement"
					description="Choose how hard this block is to pause or bypass."
					render={<button type="button" onClick={handleToggleEnforcementExpanded} />}
				>
					<span className="text-base-500 text-sm">{currentEnforcementMode.label}</span>
					<ChevronDownIcon
						className={cn(
							'text-base-400 transition-transform',
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
								<span className="text-base-950 text-sm">{mode.label}</span>
								<span className="text-base-500 mt-px text-xs">{mode.description}</span>
							</div>
							{enforcementMode === mode.value && (
								<CheckIcon className="text-primary mt-0.5 shrink-0" />
							)}
						</SettingsRowFrame>
					))}
			</SettingsGroup>
			<PickerDialog />
		</>
	);
};

const BLOCK_SCOPE_OPTIONS = [
	{
		value: 'blockTargets',
		label: 'Block selected',
		description: 'Block only the apps and websites you choose.',
		Icon: ShieldIcon
	},
	{
		value: 'allowTargets',
		label: 'Allow selected',
		description: 'Block everything except the apps and websites you choose.',
		Icon: ShieldCheckIcon
	},
	{
		value: 'wholeDevice',
		label: 'Whole device',
		description: 'Lock the whole computer behind a full-screen overlay.',
		Icon: MonitorIcon
	}
] satisfies TBlockScopeOption[];

interface TBlockScopeOption {
	value: specta.IntentionBlockScope;
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
		value: 'strict',
		label: 'Strict',
		description: 'Maximum friction for commitments you do not want to bypass.'
	}
] satisfies TEnforcementModeOption[];

interface TEnforcementModeOption {
	value: specta.IntentionEnforcementMode;
	label: string;
	description: string;
}
