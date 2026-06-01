import { useFormField } from 'feature-react/form';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { Badge, ChevronRightIcon, HelpCarousel, HelpPopover, Select } from '@/components';
import { type specta } from '@/environment';
import { cn } from '@/lib';
import {
	CatalogIconPeek,
	useCatalogPicker,
	type CatalogPickerCx,
	type TCatalogItem
} from '@/modules/catalog';
import { SettingsGroup, SettingsRow } from '@/modules/settings';
import { useNewBlockIntentionCx, type NewBlockIntentionCx } from './NewBlockIntentionCx';

export const BlockSection: React.FC = () => {
	const cx = useNewBlockIntentionCx();

	const {
		open: openCatalogPicker,
		dialog: catalogPickerDialog,
		cx: catalogPickerCx
	} = useCatalogPicker({
		onConfirm: (items: TCatalogItem[]) => {
			cx.$form.fields.selectedTargets.set(items);
		}
	});

	// MARK: - UI

	return (
		<>
			<div className="space-y-2.5">
				<SettingsGroup title="Block">
					<BlockScopeRow cx={cx} />
					<BlockTargetsRow
						cx={cx}
						catalogPickerCx={catalogPickerCx}
						onOpenPicker={openCatalogPicker}
					/>
				</SettingsGroup>
				<SettingsGroup>
					<EnforcementModeRow cx={cx} />
				</SettingsGroup>
			</div>
			{catalogPickerDialog}
		</>
	);
};

const BlockScopeRow: React.FC<TBlockScopeRowProps> = (props) => {
	const { cx } = props;
	const scopeField = useFormField(cx.$form, 'scope', { controlled: true });

	const carouselItems = React.useMemo(
		() => [
			{
				title: 'Blocking',
				description: 'Choose what this intention blocks while it is active.'
			},
			{
				title: 'Block selected',
				titlePrefix: 'Blocking',
				description: 'Blocks only the apps and websites you choose. Everything else stays open.',
				titleSuffix:
					scopeField.value === 'blockTargets' ? (
						<Badge variant="success" size="xs">
							Selected
						</Badge>
					) : undefined
			},
			{
				title: 'Allow selected',
				titlePrefix: 'Blocking',
				description: 'Blocks everything except the apps and websites you allow.',
				titleSuffix:
					scopeField.value === 'allowTargets' ? (
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
					scopeField.value === 'wholeDevice' ? (
						<Badge variant="success" size="xs">
							Selected
						</Badge>
					) : undefined
			}
		],
		[scopeField.value]
	);

	return (
		<SettingsRow
			label="Blocking"
			labelAccessory={
				<HelpPopover ariaLabel="About blocking modes">
					<HelpCarousel items={carouselItems} />
				</HelpPopover>
			}
			variant="compact"
		>
			<Select
				variant="ghost"
				{...scopeField.input({
					format: (value) => value,
					parse: (value) => value as specta.IntentionBlockScope
				})}
			>
				{blockScopeOptions.map((scopeOption) => (
					<option key={scopeOption.value} value={scopeOption.value}>
						{scopeOption.label}
					</option>
				))}
			</Select>
		</SettingsRow>
	);
};

interface TBlockScopeRowProps {
	cx: NewBlockIntentionCx;
}

const blockScopeOptions: { value: specta.IntentionBlockScope; label: string }[] = [
	{ value: 'blockTargets', label: 'Block selected' },
	{ value: 'allowTargets', label: 'Allow selected' },
	{ value: 'wholeDevice', label: 'Whole device' }
];

const BlockTargetsRow: React.FC<TBlockTargetsRowProps> = (props) => {
	const { cx, catalogPickerCx, onOpenPicker } = props;
	const scope = useFeatureState(cx.$form.fields.scope);
	const selectedTargets = useFeatureState(cx.$form.fields.selectedTargets);
	const selectedTargetsStatus = useFeatureState(cx.$form.fields.selectedTargets.status);

	const isTargetsSelectable = scope !== 'wholeDevice';
	const hasSelectedTargets = selectedTargets.length > 0;
	const targetsLabel = getTargetsLabel(scope, selectedTargets);
	const targetsDescription = getTargetsDescription(scope);
	const targetsError =
		isTargetsSelectable && selectedTargetsStatus.type === 'invalid'
			? selectedTargetsStatus.errors[0]?.message
			: undefined;

	// MARK: - Actions

	const handleOpenTargets = React.useCallback(() => {
		onOpenPicker(selectedTargets);
	}, [onOpenPicker, selectedTargets]);

	// MARK: - UI

	if (!isTargetsSelectable) {
		return (
			<SettingsRow label="Apps & websites" description={targetsDescription}>
				<span className="text-base-500 text-sm">{targetsLabel}</span>
			</SettingsRow>
		);
	}

	return (
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
						: hasSelectedTargets
							? 'text-base-500'
							: 'text-base-400'
				)}
			>
				<CatalogIconPeek items={selectedTargets} cx={catalogPickerCx} />
				{targetsLabel}
			</span>
			<ChevronRightIcon className={targetsError != null ? 'text-red-500' : 'text-base-400'} />
		</SettingsRow>
	);
};

interface TBlockTargetsRowProps {
	cx: NewBlockIntentionCx;
	catalogPickerCx: CatalogPickerCx;
	onOpenPicker: (items: TCatalogItem[]) => void;
}

function getTargetsLabel(
	scope: specta.IntentionBlockScope,
	selectedTargets: TCatalogItem[]
): string {
	if (scope === 'wholeDevice') {
		return 'Whole device';
	}
	if (selectedTargets.length > 0) {
		return `${selectedTargets.length} selected`;
	}
	return 'None';
}

function getTargetsDescription(scope: specta.IntentionBlockScope): string | undefined {
	switch (scope) {
		case 'blockTargets':
			return 'Choose which apps and websites to block.';
		case 'allowTargets':
			return 'Choose what stays available while everything else is blocked.';
		case 'wholeDevice':
			return undefined;
	}
}

const EnforcementModeRow: React.FC<TEnforcementModeRowProps> = (props) => {
	const { cx } = props;
	const enforcementModeField = useFormField(cx.$form, 'enforcementMode', { controlled: true });

	const carouselItems = React.useMemo(
		() => [
			{
				title: 'Enforcement',
				description: 'Choose how hard this Intention holds once active.'
			},
			{
				title: 'Casual',
				titlePrefix: 'Enforcement',
				description: 'End or change it anytime. Good for light accountability.',
				titleSuffix:
					enforcementModeField.value === 'casual' ? (
						<Badge variant="success" size="xs">
							Selected
						</Badge>
					) : undefined
			},
			{
				title: 'Balanced',
				titlePrefix: 'Enforcement',
				description:
					'A brief pause before ending or weakening it early. Good for regular focus sessions.',
				titleSuffix:
					enforcementModeField.value === 'balanced' ? (
						<Badge variant="success" size="xs">
							Selected
						</Badge>
					) : undefined
			},
			{
				title: 'Strict',
				titlePrefix: 'Enforcement',
				description:
					'Cannot be ended or weakened early. Best for commitments you want to hold until the end condition is met.',
				titleSuffix:
					enforcementModeField.value === 'strict' ? (
						<Badge variant="success" size="xs">
							Selected
						</Badge>
					) : undefined
			}
		],
		[enforcementModeField.value]
	);

	return (
		<SettingsRow
			label="Enforcement"
			labelAccessory={
				<HelpPopover ariaLabel="About enforcement levels">
					<HelpCarousel items={carouselItems} />
				</HelpPopover>
			}
			variant="compact"
		>
			<Select
				variant="ghost"
				{...enforcementModeField.input({
					format: (value) => value,
					parse: (value) => value as specta.IntentionEnforcementMode
				})}
			>
				{enforcementModeOptions.map((mode) => (
					<option key={mode.value} value={mode.value}>
						{mode.label}
					</option>
				))}
			</Select>
		</SettingsRow>
	);
};

interface TEnforcementModeRowProps {
	cx: NewBlockIntentionCx;
}

const enforcementModeOptions: { value: specta.IntentionEnforcementMode; label: string }[] = [
	{ value: 'casual', label: 'Casual' },
	{ value: 'balanced', label: 'Balanced' },
	{ value: 'strict', label: 'Strict' }
];
