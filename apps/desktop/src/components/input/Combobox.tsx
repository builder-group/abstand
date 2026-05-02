import { Combobox as ComboboxPrimitive } from '@base-ui/react';
import { CheckIcon, ChevronDownIcon, XIcon } from 'lucide-react';
import React from 'react';
import { cn } from '@/lib';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '../layout';
import { Button } from './Button';

export const Combobox = <GValue, GMultiple extends boolean | undefined = false>(
	props: TComboboxProps<GValue, GMultiple>
) => {
	const { children, ...rest } = props;

	return (
		<ComboboxPrimitive.Root
			data-slot="combobox"
			{...(rest as ComboboxPrimitive.Root.Props<GValue, GMultiple>)}
		>
			{children}
		</ComboboxPrimitive.Root>
	);
};

export type TComboboxProps<GValue, GMultiple extends boolean | undefined = false> = Omit<
	ComboboxPrimitive.Root.Props<GValue, GMultiple>,
	'autoHighlight'
> & {
	autoHighlight?: boolean | 'always';
};

export const ComboboxValue: React.FC<TComboboxValueProps> = (props) => {
	return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />;
};

export type TComboboxValueProps = ComboboxPrimitive.Value.Props;

export const ComboboxTrigger: React.FC<TComboboxTriggerProps> = (props) => {
	const { className, children, ...rest } = props;

	return (
		<ComboboxPrimitive.Trigger
			data-slot="combobox-trigger"
			className={cn(
				"text-base-400 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
				className
			)}
			{...rest}
		>
			{children}
			<ChevronDownIcon />
		</ComboboxPrimitive.Trigger>
	);
};

export type TComboboxTriggerProps = ComboboxPrimitive.Trigger.Props;

export const ComboboxClear: React.FC<TComboboxClearProps> = (props) => {
	const { className, ...rest } = props;

	return (
		<ComboboxPrimitive.Clear
			data-slot="combobox-clear"
			className={className}
			render={
				<InputGroupButton variant="ghost" size="icon-xs">
					<XIcon />
				</InputGroupButton>
			}
			{...rest}
		/>
	);
};

export type TComboboxClearProps = ComboboxPrimitive.Clear.Props;

export const ComboboxInput: React.FC<TComboboxInputProps> = (props) => {
	const {
		className,
		children,
		disabled = false,
		leading,
		showTrigger = true,
		showClear = false,
		ref,
		...rest
	} = props;

	return (
		<InputGroup ref={ref} className={className}>
			{leading != null && <InputGroupAddon align="inline-start">{leading}</InputGroupAddon>}
			<ComboboxPrimitive.Input render={<InputGroupInput disabled={disabled} />} {...rest} />
			<InputGroupAddon align="inline-end">
				{showTrigger && (
					<InputGroupButton
						size="icon-xs"
						variant="ghost"
						render={<ComboboxTrigger />}
						className="group-has-data-[slot=combobox-clear]/input-group:hidden data-pressed:bg-transparent"
						disabled={disabled}
					/>
				)}
				{showClear && <ComboboxClear disabled={disabled} />}
			</InputGroupAddon>
			{children}
		</InputGroup>
	);
};

export type TComboboxInputProps = Omit<ComboboxPrimitive.Input.Props, 'className' | 'ref'> & {
	className?: string;
	ref?: React.Ref<HTMLDivElement>;
	leading?: React.ReactNode;
	showTrigger?: boolean;
	showClear?: boolean;
};

export const ComboboxContent: React.FC<TComboboxContentProps> = (props) => {
	const {
		className,
		side = 'bottom',
		sideOffset = 6,
		align = 'start',
		alignOffset = 0,
		anchor,
		...rest
	} = props;

	return (
		<ComboboxPrimitive.Portal>
			<ComboboxPrimitive.Positioner
				side={side}
				sideOffset={sideOffset}
				align={align}
				alignOffset={alignOffset}
				anchor={anchor}
				className="z-50"
			>
				<ComboboxPrimitive.Popup
					data-slot="combobox-content"
					className={cn(
						'group/combobox-content bg-base-0 text-base-950 border-base-100 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 relative max-h-(--available-height) w-(--anchor-width) max-w-(--available-width) min-w-[max(var(--anchor-width),12rem)] origin-(--transform-origin) overflow-hidden rounded-xl border shadow-xl duration-100 outline-none',
						className
					)}
					{...rest}
				/>
			</ComboboxPrimitive.Positioner>
		</ComboboxPrimitive.Portal>
	);
};

export type TComboboxContentProps = ComboboxPrimitive.Popup.Props &
	Pick<
		ComboboxPrimitive.Positioner.Props,
		'side' | 'align' | 'sideOffset' | 'alignOffset' | 'anchor'
	>;

export const ComboboxList: React.FC<TComboboxListProps> = (props) => {
	const { className, ...rest } = props;

	return (
		<ComboboxPrimitive.List
			data-slot="combobox-list"
			className={cn(
				'no-scrollbar max-h-[min(18rem,var(--available-height))] overflow-y-auto overscroll-contain p-1',
				className
			)}
			{...rest}
		/>
	);
};

export type TComboboxListProps = ComboboxPrimitive.List.Props;

export const ComboboxItem: React.FC<TComboboxItemProps> = (props) => {
	const { className, children, onMouseMoveCapture, ...rest } = props;

	const handleMouseMoveCapture = React.useCallback(
		(event: Parameters<NonNullable<TComboboxItemProps['onMouseMoveCapture']>>[0]) => {
			onMouseMoveCapture?.(event);
			if (event.isPropagationStopped()) {
				return;
			}

			// WebKit emits zero-delta mousemove events while keyboard scrolling the list, see https://github.com/mui/base-ui/issues/4002
			const nativeEvent = event.nativeEvent;
			const isStationaryWebKitMouseMove =
				'webkitForce' in nativeEvent && nativeEvent.movementX === 0 && nativeEvent.movementY === 0;
			if (isStationaryWebKitMouseMove) {
				event.stopPropagation();
			}
		},
		[onMouseMoveCapture]
	);

	return (
		<ComboboxPrimitive.Item
			data-slot="combobox-item"
			className={cn(
				"text-base-700 data-highlighted:bg-base-950/6 data-highlighted:text-base-950 relative flex w-full cursor-default items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
				className
			)}
			onMouseMoveCapture={handleMouseMoveCapture}
			{...rest}
		>
			{children}
			<ComboboxPrimitive.ItemIndicator
				render={
					<span className="text-primary pointer-events-none absolute right-2 flex size-4 items-center justify-center">
						<CheckIcon />
					</span>
				}
			/>
		</ComboboxPrimitive.Item>
	);
};

export type TComboboxItemProps = ComboboxPrimitive.Item.Props;

export const ComboboxGroup: React.FC<TComboboxGroupProps> = (props) => {
	const { className, ...rest } = props;

	return <ComboboxPrimitive.Group data-slot="combobox-group" className={className} {...rest} />;
};

export type TComboboxGroupProps = ComboboxPrimitive.Group.Props;

export const ComboboxLabel: React.FC<TComboboxLabelProps> = (props) => {
	const { className, ...rest } = props;

	return (
		<ComboboxPrimitive.GroupLabel
			data-slot="combobox-label"
			className={cn('text-base-500 px-2 py-1 text-xs font-medium', className)}
			{...rest}
		/>
	);
};

export type TComboboxLabelProps = ComboboxPrimitive.GroupLabel.Props;

export const ComboboxCollection: React.FC<TComboboxCollectionProps> = (props) => {
	return <ComboboxPrimitive.Collection data-slot="combobox-collection" {...props} />;
};

export type TComboboxCollectionProps = ComboboxPrimitive.Collection.Props;

export const ComboboxStatus: React.FC<TComboboxStatusProps> = (props) => {
	const { className, ...rest } = props;

	return (
		<ComboboxPrimitive.Status
			data-slot="combobox-status"
			className={cn(
				'text-base-500 border-base-100 bg-base-50/60 border-b px-3 py-2 text-xs font-medium',
				className
			)}
			{...rest}
		/>
	);
};

export type TComboboxStatusProps = ComboboxPrimitive.Status.Props;

export const ComboboxEmpty: React.FC<TComboboxEmptyProps> = (props) => {
	const { className, ...rest } = props;

	return (
		<ComboboxPrimitive.Empty
			data-slot="combobox-empty"
			className={cn(
				'text-base-500 hidden justify-center px-3 py-3 text-center text-sm group-data-empty/combobox-content:flex',
				className
			)}
			{...rest}
		/>
	);
};

export type TComboboxEmptyProps = ComboboxPrimitive.Empty.Props;

export const ComboboxSeparator: React.FC<TComboboxSeparatorProps> = (props) => {
	const { className, ...rest } = props;

	return (
		<ComboboxPrimitive.Separator
			data-slot="combobox-separator"
			className={cn('bg-base-100 -mx-1 my-1 h-px', className)}
			{...rest}
		/>
	);
};

export type TComboboxSeparatorProps = ComboboxPrimitive.Separator.Props;

export const ComboboxChips: React.FC<TComboboxChipsProps> = (props) => {
	const { className, ...rest } = props;

	return (
		<ComboboxPrimitive.Chips
			data-slot="combobox-chips"
			className={cn(
				'border-base-200 bg-base-0 text-base-950 focus-within:border-primary focus-within:ring-primary/30 has-aria-invalid:border-error has-aria-invalid:ring-error/20 flex min-h-8 w-full flex-wrap items-center gap-1 rounded-lg border px-2 py-1 transition focus-within:ring-2 has-aria-invalid:ring-2',
				className
			)}
			{...rest}
		/>
	);
};

export type TComboboxChipsProps = ComboboxPrimitive.Chips.Props;

export const ComboboxChip: React.FC<TComboboxChipProps> = (props) => {
	const { className, children, showRemove = true, ...rest } = props;

	return (
		<ComboboxPrimitive.Chip
			data-slot="combobox-chip"
			className={cn(
				'bg-base-950/6 text-base-700 inline-flex h-5 items-center gap-1 rounded-md pr-0.5 pl-1.5 text-xs font-medium whitespace-nowrap has-disabled:pointer-events-none has-disabled:opacity-50',
				className
			)}
			{...rest}
		>
			{children}
			{showRemove && (
				<ComboboxPrimitive.ChipRemove
					data-slot="combobox-chip-remove"
					render={
						<Button
							variant="ghost"
							size="icon-xs"
							className="text-base-500 hover:text-base-950 size-4 rounded-sm p-0"
						>
							<XIcon className="size-3" />
						</Button>
					}
				/>
			)}
		</ComboboxPrimitive.Chip>
	);
};

export type TComboboxChipProps = ComboboxPrimitive.Chip.Props & {
	showRemove?: boolean;
};

export const ComboboxChipsInput: React.FC<TComboboxChipsInputProps> = (props) => {
	const { className, ...rest } = props;

	return (
		<ComboboxPrimitive.Input
			data-slot="combobox-chip-input"
			className={cn(
				'placeholder:text-base-400 min-w-12 flex-1 bg-transparent px-0 py-0 text-sm outline-none',
				className
			)}
			{...rest}
		/>
	);
};

export type TComboboxChipsInputProps = ComboboxPrimitive.Input.Props;

export function useComboboxAnchor() {
	return React.useRef<HTMLDivElement | null>(null);
}
