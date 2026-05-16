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
	const enforcementMode = useFeatureState(cx.$form.fields.enforcementMode);
	const selectedTargets = useCompute(cx.$form.fields.selectedTargets, ({ value }) => value ?? []);
	const selectedTargetsStatus = useFeatureState(cx.$form.fields.selectedTargets.status);
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
				return 'Choose which apps and sites to block.';
			case 'allowTargets':
				return 'Choose what stays available while everything else is blocked.';
			case 'wholeDevice':
			default:
				return undefined;
		}
	}, [scope]);
	const targetsError =
		isTargetsSelectable && selectedTargetsStatus.type === 'INVALID'
			? selectedTargetsStatus.errors[0]?.message
			: undefined;

	const blockScopeCarouselItems = React.useMemo(
		() => [
			{
				title: 'Blocking',
				description: (
					<>
						Choose what gets blocked when this intention is active.{' '}
						<span className="text-base-400">Use arrows to compare options.</span>
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
						Choose how hard this block is to pause or end early.{' '}
						<span className="text-base-400">Use arrows to compare options.</span>
					</>
				)
			},
			{
				title: 'Casual',
				titlePrefix: 'Enforcement',
				description: 'Exit anytime. Good for light accountability.',
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
				description: 'A brief pause before you can exit early. Good for regular focus sessions.',
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
				description: 'Cannot be ended early. Best for commitments you want to lock in.',
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

			const shouldRevalidateTargets = cx.$form.fields.selectedTargets.isSubmitted.get();
			if (shouldRevalidateTargets) {
				void cx.$form.fields.selectedTargets.validate();
			}
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
					variant="compact"
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
						description={targetsError ?? targetsDescription}
						descriptionVariant={targetsError != null ? 'error' : 'default'}
						render={<button type="button" onClick={handleOpenTargets} />}
					>
						<span
							className={cn(
								'inline-flex items-center gap-1.5 text-sm',
								targetsError != null
									? 'text-red-500'
									: selectedTargets.length > 0
										? 'text-base-500'
										: 'text-base-400'
							)}
						>
							<CatalogIconPeek items={selectedTargets} cx={catalogPickerCx} />
							{targetsLabel}
						</span>
						<ChevronRightIcon
							className={cn(targetsError != null ? 'text-red-500' : 'text-base-400')}
						/>
					</SettingsRow>
				) : (
					<SettingsRow
						label="Apps & websites"
						description={targetsError ?? targetsDescription}
						descriptionVariant={targetsError != null ? 'error' : 'default'}
					>
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
					variant="compact"
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

const blockScopeOptions: { value: specta.IntentionBlockScope; label: string }[] = [
	{ value: 'blockTargets', label: 'Block selected' },
	{ value: 'allowTargets', label: 'Allow selected' },
	{ value: 'wholeDevice', label: 'Whole device' }
];

const enforcementModeOptions: { value: specta.IntentionEnforcementMode; label: string }[] = [
	{ value: 'casual', label: 'Casual' },
	{ value: 'balanced', label: 'Balanced' },
	{ value: 'strict', label: 'Strict' }
];
