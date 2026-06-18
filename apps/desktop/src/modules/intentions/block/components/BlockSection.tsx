import { useFormField } from 'feature-react/form';
import { useCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import {
	Badge,
	ChevronRightIcon,
	HelpCarousel,
	HelpPopover,
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupStepper,
	Select
} from '@/components';
import { type specta } from '@/environment';
import { clampNumber, cn } from '@/lib';
import {
	CatalogIconPeek,
	getCatalogItemKey,
	isWebsiteCatalogItem,
	useCatalogPicker,
	type TCatalogItem,
	type TCatalogPickerItemDisabledState
} from '@/modules/catalog';
import { SettingsGroup, SettingsRow } from '@/modules/settings';
import { blockIntentionFormConfig, type BlockIntentionFormCx } from '../BlockIntentionFormCx';

export const BlockSection: React.FC<TBlockSectionProps> = (props) => {
	const { formCx, isDisabled = false } = props;

	const { open: openBaseTargetPicker, dialog: baseTargetPickerDialog } = useCatalogPicker({
		title: 'Select Apps & Websites',
		getItemDisabledState: (item) => getBaseTargetPickerDisabledState(formCx, item),
		onConfirm: (items: TCatalogItem[]) => {
			// Note: The picker can already be open when a submit starts, so ignore late confirms
			if (isDisabled) {
				return;
			}

			formCx.$form.fields.baseTargets.set(items);
			const hasWebsiteBaseTargets = items.some(isWebsiteCatalogItem);
			if (!hasWebsiteBaseTargets) {
				formCx.$form.fields.exceptionTargets.set([]);
			}
		}
	});
	const { open: openExceptionTargetPicker, dialog: exceptionTargetPickerDialog } = useCatalogPicker(
		{
			title: 'Select Website Exceptions',
			searchPlaceholder: 'Search websites…',
			searchStatus: 'Select websites',
			isItemVisible: isWebsiteCatalogItem,
			getItemDisabledState: (item) => getExceptionTargetPickerDisabledState(formCx, item),
			onConfirm: (items: TCatalogItem[]) => {
				// Note: The picker can already be open when a submit starts, so ignore late confirms
				if (isDisabled) {
					return;
				}

				formCx.$form.fields.exceptionTargets.set(items.filter(isWebsiteCatalogItem));
			}
		}
	);

	// MARK: - UI

	return (
		<>
			<div className="space-y-2.5">
				<SettingsGroup title="Block">
					<BlockScopeRow formCx={formCx} isDisabled={isDisabled} />
					<BlockTargetRows
						formCx={formCx}
						isDisabled={isDisabled}
						onOpenBaseTargetPicker={openBaseTargetPicker}
						onOpenExceptionTargetPicker={openExceptionTargetPicker}
					/>
				</SettingsGroup>
				<SettingsGroup>
					<EnforcementModeRow formCx={formCx} isDisabled={isDisabled} />
				</SettingsGroup>
			</div>
			{baseTargetPickerDialog}
			{exceptionTargetPickerDialog}
		</>
	);
};

interface TBlockSectionProps {
	formCx: BlockIntentionFormCx;
	isDisabled?: boolean;
}

function getBaseTargetPickerDisabledState(
	formCx: BlockIntentionFormCx,
	item: TCatalogItem
): TCatalogPickerItemDisabledState | null {
	const exceptionTargets = formCx.$form.fields.exceptionTargets.get() ?? [];
	if (containsCatalogItemKey(exceptionTargets, item)) {
		return { message: 'already an exception' };
	}

	return null;
}

function getExceptionTargetPickerDisabledState(
	formCx: BlockIntentionFormCx,
	item: TCatalogItem
): TCatalogPickerItemDisabledState | null {
	const baseTargets = formCx.$form.fields.baseTargets.get() ?? [];
	if (!containsCatalogItemKey(baseTargets, item)) {
		return null;
	}

	return {
		message:
			formCx.$form.fields.scope.get() === 'allowTargets' ? 'already allowed' : 'already blocked'
	};
}

function containsCatalogItemKey(items: TCatalogItem[], item: TCatalogItem): boolean {
	const itemKey = getCatalogItemKey(item);
	return items.some((candidate) => getCatalogItemKey(candidate) === itemKey);
}

const BlockScopeRow: React.FC<TBlockScopeRowProps> = (props) => {
	const { formCx, isDisabled = false } = props;
	const scopeField = useFormField(formCx.$form, 'scope', { controlled: true });

	const carouselItems = React.useMemo(
		() => [
			{
				title: 'Blocking',
				description: 'Choose what this Intention blocks while it is running.'
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
				disabled={isDisabled}
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
	formCx: BlockIntentionFormCx;
	isDisabled?: boolean;
}

const blockScopeOptions: { value: specta.IntentionBlockScope; label: string }[] = [
	{ value: 'blockTargets', label: 'Block selected' },
	{ value: 'allowTargets', label: 'Allow selected' },
	{ value: 'wholeDevice', label: 'Whole device' }
];

const BlockTargetRows: React.FC<TBlockTargetRowsProps> = (props) => {
	const { formCx, isDisabled = false, onOpenBaseTargetPicker, onOpenExceptionTargetPicker } = props;
	const scope = useFeatureState(formCx.$form.fields.scope);

	const baseTargets = useFeatureState(formCx.$form.fields.baseTargets);
	const baseTargetsStatus = useFeatureState(formCx.$form.fields.baseTargets.status);
	const exceptionTargets = useCompute(formCx.$form.fields.exceptionTargets, (targets) =>
		targets.filter(isWebsiteCatalogItem)
	);
	const exceptionTargetsStatus = useFeatureState(formCx.$form.fields.exceptionTargets.status);

	const hasBaseWebsiteTargets = baseTargets.some(isWebsiteCatalogItem);

	// MARK: - UI

	if (scope === 'wholeDevice') {
		return (
			<SettingsRow label="Apps & websites">
				<span className="text-base-500 text-sm">Whole device</span>
			</SettingsRow>
		);
	}

	const baseTargetsError =
		baseTargetsStatus.type === 'invalid' ? baseTargetsStatus.errors[0]?.message : undefined;
	const exceptionTargetsError =
		exceptionTargetsStatus.type === 'invalid'
			? exceptionTargetsStatus.errors[0]?.message
			: undefined;

	return (
		<>
			<CatalogTargetRow
				label={getBaseTargetsLabel(scope)}
				description={baseTargetsError ?? getBaseTargetsDescription(scope)}
				targets={baseTargets}
				error={baseTargetsError}
				isDisabled={isDisabled}
				onOpenPicker={onOpenBaseTargetPicker}
			/>
			{hasBaseWebsiteTargets && (
				<CatalogTargetRow
					label="Website exceptions"
					description={exceptionTargetsError ?? getExceptionTargetsDescription(scope)}
					targets={exceptionTargets}
					error={exceptionTargetsError}
					isDisabled={isDisabled}
					onOpenPicker={onOpenExceptionTargetPicker}
				/>
			)}
		</>
	);
};

interface TBlockTargetRowsProps {
	formCx: BlockIntentionFormCx;
	isDisabled?: boolean;
	onOpenBaseTargetPicker: (items: TCatalogItem[]) => void;
	onOpenExceptionTargetPicker: (items: TCatalogItem[]) => void;
}

function getBaseTargetsLabel(scope: TSelectableBlockScope): string {
	switch (scope) {
		case 'blockTargets':
			return 'Blocked apps & websites';
		case 'allowTargets':
			return 'Allowed apps & websites';
	}
}

function getBaseTargetsDescription(scope: TSelectableBlockScope): string {
	switch (scope) {
		case 'blockTargets':
			return 'Choose which apps and websites to block.';
		case 'allowTargets':
			return 'Choose what stays available while everything else is blocked.';
	}
}

function getExceptionTargetsDescription(scope: TSelectableBlockScope): string {
	switch (scope) {
		case 'blockTargets':
			return 'Keep these available even when covered by the blocked selection.';
		case 'allowTargets':
			return 'Block these even when covered by the allowed selection.';
	}
}

type TSelectableBlockScope = Exclude<specta.IntentionBlockScope, 'wholeDevice'>;

const CatalogTargetRow: React.FC<TCatalogTargetRowProps> = (props) => {
	const { label, description, targets, error, isDisabled = false, onOpenPicker } = props;
	const hasTargets = targets.length > 0;
	const hasError = error != null;

	// MARK: - Actions

	const handleOpenPicker = React.useCallback(() => {
		if (isDisabled) {
			return;
		}

		onOpenPicker(targets);
	}, [isDisabled, onOpenPicker, targets]);

	// MARK: - UI

	return (
		<SettingsRow
			label={label}
			description={description}
			descriptionVariant={hasError ? 'error' : 'default'}
			interactive={!isDisabled}
			render={<button type="button" disabled={isDisabled} onClick={handleOpenPicker} />}
		>
			<span
				className={cn(
					'inline-flex items-center gap-1.5 text-sm',
					hasError ? 'text-red-500' : hasTargets ? 'text-base-500' : 'text-base-400'
				)}
			>
				<CatalogIconPeek items={targets} />
				{getTargetCountLabel(targets)}
			</span>
			<ChevronRightIcon className={hasError ? 'text-red-500' : 'text-base-400'} />
		</SettingsRow>
	);
};

interface TCatalogTargetRowProps {
	label: string;
	description: string | undefined;
	targets: TCatalogItem[];
	error?: string;
	isDisabled?: boolean;
	onOpenPicker: (items: TCatalogItem[]) => void;
}

function getTargetCountLabel(targets: TCatalogItem[]): string {
	if (targets.length > 0) {
		return `${targets.length} selected`;
	}
	return 'None';
}

const EnforcementModeRow: React.FC<TEnforcementModeRowProps> = (props) => {
	const { formCx, isDisabled = false } = props;
	const enforcementModeField = useFormField(formCx.$form, 'enforcementMode', {
		controlled: true
	});
	const isBalanced = enforcementModeField.value === 'balanced';
	const isStrict = enforcementModeField.value === 'strict';

	const carouselItems = React.useMemo(
		() => [
			{
				title: 'Enforcement',
				description: 'Choose how firmly this Intention holds while it is running.'
			},
			{
				title: 'Casual',
				titlePrefix: 'Enforcement',
				description: 'End or weaken anytime. Good for light accountability.',
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
					'Requires a configurable pause before ending, weakening, or quitting. Good for regular focus sessions.',
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
					'Blocks ending or weakening while running. Best for commitments that should hold until their end condition.',
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
		<>
			<SettingsRow
				label="Enforcement"
				description={
					isStrict
						? 'Strict blocks ending or weakening while running. Abstand may also be harder to quit.'
						: undefined
				}
				descriptionVariant={isStrict ? 'warning' : 'default'}
				labelAccessory={
					<HelpPopover ariaLabel="About enforcement levels">
						<HelpCarousel items={carouselItems} />
					</HelpPopover>
				}
				variant={isStrict ? 'default' : 'compact'}
			>
				<Select
					variant="ghost"
					{...enforcementModeField.input({
						format: (value) => value,
						parse: (value) => value as specta.IntentionEnforcementMode
					})}
					disabled={isDisabled}
				>
					{enforcementModeOptions.map((mode) => (
						<option key={mode.value} value={mode.value}>
							{mode.label}
						</option>
					))}
				</Select>
			</SettingsRow>
			{isBalanced && <BalancedDelayRow formCx={formCx} isDisabled={isDisabled} />}
		</>
	);
};

interface TEnforcementModeRowProps {
	formCx: BlockIntentionFormCx;
	isDisabled?: boolean;
}

const enforcementModeOptions: { value: specta.IntentionEnforcementMode; label: string }[] = [
	{ value: 'casual', label: 'Casual' },
	{ value: 'balanced', label: 'Balanced' },
	{ value: 'strict', label: 'Strict' }
];

const BalancedDelayRow: React.FC<TBalancedDelayRowProps> = (props) => {
	const { formCx, isDisabled = false } = props;
	const delayField = useFormField(formCx.$form, 'balancedDelayMs', {
		controlled: true
	});
	const delayError =
		delayField.status.type === 'invalid' ? delayField.status.errors[0]?.message : undefined;
	const delaySeconds = Math.floor(delayField.value / 1_000);

	const delayConfig = blockIntentionFormConfig.balancedDelay;
	const minSeconds = delayConfig.minMs / 1_000;
	const maxSeconds = delayConfig.maxMs / 1_000;
	const stepSeconds = delayConfig.stepMs / 1_000;

	// MARK: - Actions

	const handleSecondsChange = React.useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const nextSeconds = Number(event.target.value);
			if (!Number.isFinite(nextSeconds)) {
				return;
			}

			formCx.$form.fields.balancedDelayMs.set(clampDelaySeconds(nextSeconds) * 1_000);
		},
		[formCx]
	);

	const handleStep = React.useCallback(
		(deltaSeconds: number) => {
			formCx.$form.fields.balancedDelayMs.set(
				clampDelaySeconds(delaySeconds + deltaSeconds) * 1_000
			);
		},
		[formCx, delaySeconds]
	);

	// MARK: - UI

	return (
		<SettingsRow
			label="Balanced pause"
			description={
				delayError ??
				'Required before ending, weakening, or quitting while this Intention is running.'
			}
			descriptionVariant={delayError != null ? 'error' : 'default'}
			contentClassName="min-w-0 shrink justify-end"
		>
			<InputGroup className="w-20">
				<InputGroupInput
					type="number"
					min={minSeconds}
					max={maxSeconds}
					step={stepSeconds}
					value={delaySeconds}
					disabled={isDisabled}
					onChange={handleSecondsChange}
					aria-label="Balanced pause seconds"
					aria-invalid={delayError != null}
				/>
				<InputGroupAddon align="inline-end" className="pr-2 text-xs">
					sec
				</InputGroupAddon>
				<InputGroupStepper
					onIncrement={() => handleStep(stepSeconds)}
					onDecrement={() => handleStep(-stepSeconds)}
					incrementDisabled={isDisabled || delaySeconds >= maxSeconds}
					decrementDisabled={isDisabled || delaySeconds <= minSeconds}
					incrementLabel="Increase Balanced pause"
					decrementLabel="Decrease Balanced pause"
				/>
			</InputGroup>
		</SettingsRow>
	);
};

interface TBalancedDelayRowProps {
	formCx: BlockIntentionFormCx;
	isDisabled?: boolean;
}

function clampDelaySeconds(seconds: number): number {
	const delayConfig = blockIntentionFormConfig.balancedDelay;

	return clampNumber(Math.trunc(seconds), delayConfig.minMs / 1_000, delayConfig.maxMs / 1_000);
}
