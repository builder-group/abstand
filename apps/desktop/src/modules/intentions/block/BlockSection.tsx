import { useCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import { Badge, ChevronRightIcon, HelpCarousel, HelpPopover, Select } from '@/components';
import { type specta } from '@/environment';
import { cn } from '@/lib';
import { CatalogIconPeek, useCatalogPicker, type TCatalogItem } from '@/modules/catalog';
import { SettingsGroup, SettingsRow } from '@/modules/settings';
import { useNewBlockIntentionCx } from './NewBlockIntentionCx';

export const BlockSection: React.FC = () => {
	const cx = useNewBlockIntentionCx();

	const scope = useFeatureState(cx.$form.fields.scope);
	const currentScope =
		blockScopeOptions.find((option) => option.value === scope) ??
		(blockScopeOptions[0] as TBlockScopeOption);

	const enforcementMode = useFeatureState(cx.$form.fields.enforcementMode);
	const currentEnforcementMode =
		enforcementModeOptions.find((mode) => mode.value === enforcementMode) ??
		(enforcementModeOptions[1] as TEnforcementModeOption);

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
			default:
				return undefined;
		}
	}, [scope]);

	const blockScopeCarouselItems = React.useMemo(
		() => [
			{
				title: 'Blocking',
				description: (
					<>
						Choose what gets blocked when this intention is active.{' '}
						<span className="text-base-400">Use arrows to see each option.</span>
					</>
				)
			},
			{
				title: 'Block selected',
				titlePrefix: 'Blocking',
				description: 'Blocks only the apps and sites you choose. Everything else stays open.',
				titleSuffix:
					scope === 'blockTargets' ? (
						<Badge variant="success" size="xs">
							Selected
						</Badge>
					) : undefined
			},
			{
				title: 'Allow selected',
				titlePrefix: 'Blocking',
				description: 'Blocks everything except the apps and sites you allow.',
				titleSuffix:
					scope === 'allowTargets' ? (
						<Badge variant="success" size="xs">
							Selected
						</Badge>
					) : undefined
			},
			{
				title: 'Whole device',
				titlePrefix: 'Blocking',
				description:
					'Locks the entire computer behind a full-screen overlay. Nothing is accessible.',
				titleSuffix:
					scope === 'wholeDevice' ? (
						<Badge variant="success" size="xs">
							Selected
						</Badge>
					) : undefined
			}
		],
		[scope]
	);
	const enforcementCarouselItems = React.useMemo(
		() => [
			{
				title: 'Enforcement',
				description: (
					<>
						How hard this block is to pause or bypass.{' '}
						<span className="text-base-400">Use arrows to see each option.</span>
					</>
				)
			},
			{
				title: 'Casual',
				titlePrefix: 'Enforcement',
				description: 'Easy to pause or bypass. Good for light accountability.',
				titleSuffix:
					enforcementMode === 'casual' ? (
						<Badge variant="success" size="xs">
							Selected
						</Badge>
					) : undefined
			},
			{
				title: 'Balanced',
				titlePrefix: 'Enforcement',
				description: 'Moderate friction before bypassing. Good for regular focus sessions.',
				titleSuffix:
					enforcementMode === 'balanced' ? (
						<Badge variant="success" size="xs">
							Selected
						</Badge>
					) : undefined
			},
			{
				title: 'Strict',
				titlePrefix: 'Enforcement',
				description: 'Hard to bypass. Best for commitments you want to keep.',
				titleSuffix:
					enforcementMode === 'strict' ? (
						<Badge variant="success" size="xs">
							Selected
						</Badge>
					) : undefined
			}
		],
		[enforcementMode]
	);

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

	const handleScopeChange = React.useCallback(
		(event: React.ChangeEvent<HTMLSelectElement>) => {
			cx.$form.fields.scope.set(event.target.value as specta.IntentionBlockScope);
		},
		[cx]
	);

	const handleEnforcementModeChange = React.useCallback(
		(event: React.ChangeEvent<HTMLSelectElement>) => {
			cx.$form.fields.enforcementMode.set(event.target.value as specta.IntentionEnforcementMode);
		},
		[cx]
	);

	const handleOpenTargets = React.useCallback(() => {
		openPicker(selectedTargets);
	}, [openPicker, selectedTargets]);

	// MARK: - UI

	return (
		<div className="space-y-2.5">
			<SettingsGroup title="Block">
				<SettingsRow
					label="Blocking"
					labelAccessory={
						<HelpPopover ariaLabel="About blocking modes">
							<HelpCarousel items={blockScopeCarouselItems} />
						</HelpPopover>
					}
					description={currentScope.description}
				>
					<Select variant="ghost" value={scope} onChange={handleScopeChange}>
						{blockScopeOptions.map((scopeOption) => (
							<option key={scopeOption.value} value={scopeOption.value}>
								{scopeOption.label}
							</option>
						))}
					</Select>
				</SettingsRow>

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
			</SettingsGroup>
			<SettingsGroup>
				<SettingsRow
					label="Enforcement"
					labelAccessory={
						<HelpPopover ariaLabel="About enforcement levels">
							<HelpCarousel items={enforcementCarouselItems} />
						</HelpPopover>
					}
					description={currentEnforcementMode.description}
				>
					<Select variant="ghost" value={enforcementMode} onChange={handleEnforcementModeChange}>
						{enforcementModeOptions.map((mode) => (
							<option key={mode.value} value={mode.value}>
								{mode.label}
							</option>
						))}
					</Select>
				</SettingsRow>
			</SettingsGroup>
			<PickerDialog />
		</div>
	);
};

const blockScopeOptions = [
	{
		value: 'blockTargets',
		label: 'Block selected',
		description: 'Block only the apps and websites you choose.'
	},
	{
		value: 'allowTargets',
		label: 'Allow selected',
		description: 'Block everything except the apps and websites you choose.'
	},
	{
		value: 'wholeDevice',
		label: 'Whole device',
		description: 'Lock the whole computer behind a full-screen overlay.'
	}
] satisfies TBlockScopeOption[];

interface TBlockScopeOption {
	value: specta.IntentionBlockScope;
	label: string;
	description: string;
}

const enforcementModeOptions = [
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
