import { Combobox as ComboboxPrimitive } from '@base-ui/react';
import { cva, type VariantProps } from 'class-variance-authority';
import { CheckIcon, ChevronDownIcon, XIcon } from 'lucide-react';
import React from 'react';
import { cn } from '@/lib';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '../layout';
import { Button } from './Button';

const ComboboxContext = React.createContext<TComboboxContext>({
	size: 'default'
});

interface TComboboxContext {
	size: TComboboxSize;
}

type TComboboxSize = NonNullable<VariantProps<typeof comboboxContentVariants>['size']>;

export const Combobox = <GValue, GMultiple extends boolean | undefined = false>(
	props: TComboboxProps<GValue, GMultiple>
) => {
	const { size = 'default', children, ...rest } = props;

	return (
		<ComboboxContext.Provider value={{ size }}>
			<ComboboxPrimitive.Root
				data-slot="combobox"
				data-size={size}
				{...(rest as ComboboxPrimitive.Root.Props<GValue, GMultiple>)}
			>
				{children}
			</ComboboxPrimitive.Root>
		</ComboboxContext.Provider>
	);
};

export type TComboboxProps<GValue, GMultiple extends boolean | undefined = false> = Omit<
	ComboboxPrimitive.Root.Props<GValue, GMultiple>,
	'autoHighlight'
> & {
	autoHighlight?: boolean | 'always';
	size?: TComboboxSize;
};

export const ComboboxValue: React.FC<TComboboxValueProps> = (props) => {
	return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />;
};

export type TComboboxValueProps = ComboboxPrimitive.Value.Props;

export const ComboboxTrigger: React.FC<TComboboxTriggerProps> = (props) => {
	const { children, className, ...rest } = props;
	const { size } = React.useContext(ComboboxContext);

	return (
		<ComboboxPrimitive.Trigger
			data-slot="combobox-trigger"
			data-size={size}
			className={cn(comboboxTriggerVariants({ size }), className)}
			{...rest}
		>
			{children}
			<ChevronDownIcon />
		</ComboboxPrimitive.Trigger>
	);
};

const comboboxTriggerVariants = cva('text-base-400 [&_svg]:pointer-events-none [&_svg]:shrink-0', {
	variants: {
		size: {
			default: "[&_svg:not([class*='size-'])]:size-3.5",
			md: "[&_svg:not([class*='size-'])]:size-4"
		}
	},
	defaultVariants: {
		size: 'default'
	}
});

export type TComboboxTriggerProps = ComboboxPrimitive.Trigger.Props;

export const ComboboxClear: React.FC<TComboboxClearProps> = (props) => {
	const { className, ...rest } = props;

	return (
		<ComboboxPrimitive.Clear
			data-slot="combobox-clear"
			className={className}
			render={
				<InputGroupButton variant="ghost">
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
		leading,
		showTrigger = true,
		showClear = false,
		disabled = false,
		ref,
		children,
		className,
		...rest
	} = props;
	const { size } = React.useContext(ComboboxContext);

	return (
		<InputGroup ref={ref} size={size} className={className}>
			{leading != null && <InputGroupAddon align="inline-start">{leading}</InputGroupAddon>}
			<ComboboxPrimitive.Input render={<InputGroupInput disabled={disabled} />} {...rest} />
			<InputGroupAddon align="inline-end">
				{showTrigger && (
					<InputGroupButton
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
		side = 'bottom',
		sideOffset = 6,
		align = 'start',
		alignOffset = 0,
		anchor,
		className,
		...rest
	} = props;
	const { size } = React.useContext(ComboboxContext);

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
					data-size={size}
					className={cn(comboboxContentVariants({ size }), className)}
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

const comboboxContentVariants = cva(
	'group/combobox-content bg-base-0 text-base-950 border-base-100 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 relative max-h-(--available-height) w-(--anchor-width) max-w-(--available-width) min-w-[max(var(--anchor-width),12rem)] origin-(--transform-origin) overflow-hidden border shadow-xl duration-100 outline-none',
	{
		variants: {
			size: {
				default: 'rounded-xl',
				md: 'rounded-xl'
			}
		},
		defaultVariants: {
			size: 'default'
		}
	}
);

export const ComboboxList: React.FC<TComboboxListProps> = (props) => {
	const { className, ...rest } = props;
	const { size } = React.useContext(ComboboxContext);

	return (
		<ComboboxPrimitive.List
			data-slot="combobox-list"
			data-size={size}
			className={cn(comboboxListVariants({ size }), className)}
			{...rest}
		/>
	);
};

const comboboxListVariants = cva(
	'no-scrollbar max-h-[min(18rem,var(--available-height))] overflow-y-auto overscroll-contain',
	{
		variants: {
			size: {
				default: 'p-1',
				md: 'p-1'
			}
		},
		defaultVariants: {
			size: 'default'
		}
	}
);

export type TComboboxListProps = ComboboxPrimitive.List.Props;

export const ComboboxItem: React.FC<TComboboxItemProps> = (props) => {
	const { onMouseMoveCapture, children, className, ...rest } = props;
	const { size } = React.useContext(ComboboxContext);

	const handleMouseMoveCapture = React.useCallback(
		(event: Parameters<NonNullable<TComboboxItemProps['onMouseMoveCapture']>>[0]) => {
			onMouseMoveCapture?.(event);
			if (event.isPropagationStopped()) {
				return;
			}

			// Ignore WebKit zero-delta mousemove events during keyboard list scrolling, see https://github.com/mui/base-ui/issues/4002
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
			data-size={size}
			className={cn(comboboxItemVariants({ size }), className)}
			onMouseMoveCapture={handleMouseMoveCapture}
			{...rest}
		>
			{children}
			<ComboboxPrimitive.ItemIndicator
				render={
					<span
						data-slot="combobox-item-indicator"
						data-size={size}
						className={comboboxItemIndicatorVariants({ size })}
					>
						<CheckIcon />
					</span>
				}
			/>
		</ComboboxPrimitive.Item>
	);
};

const comboboxItemVariants = cva(
	'group/combobox-item text-base-700 data-highlighted:bg-base-950/6 data-highlighted:text-base-950 relative flex w-full cursor-default items-center outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
	{
		variants: {
			size: {
				default:
					"gap-1.5 rounded-lg px-1.5 py-1 text-[13px] [&_svg:not([class*='size-'])]:size-3.5",
				md: "gap-2 rounded-lg px-2 py-1.5 text-sm [&_svg:not([class*='size-'])]:size-4"
			}
		},
		defaultVariants: {
			size: 'default'
		}
	}
);

const comboboxItemIndicatorVariants = cva(
	'text-primary pointer-events-none absolute flex items-center justify-center',
	{
		variants: {
			size: {
				default: 'right-1.5 size-3.5',
				md: 'right-2 size-4'
			}
		},
		defaultVariants: {
			size: 'default'
		}
	}
);

export type TComboboxItemProps = ComboboxPrimitive.Item.Props;

export const ComboboxGroup: React.FC<TComboboxGroupProps> = (props) => {
	const { className, ...rest } = props;

	return <ComboboxPrimitive.Group data-slot="combobox-group" className={className} {...rest} />;
};

export type TComboboxGroupProps = ComboboxPrimitive.Group.Props;

export const ComboboxLabel: React.FC<TComboboxLabelProps> = (props) => {
	const { className, ...rest } = props;
	const { size } = React.useContext(ComboboxContext);

	return (
		<ComboboxPrimitive.GroupLabel
			data-slot="combobox-label"
			data-size={size}
			className={cn(comboboxLabelVariants({ size }), className)}
			{...rest}
		/>
	);
};

const comboboxLabelVariants = cva('text-base-500 font-medium', {
	variants: {
		size: {
			default: 'px-1.5 py-0.5 text-[11px]',
			md: 'px-2 py-1 text-xs'
		}
	},
	defaultVariants: {
		size: 'default'
	}
});

export type TComboboxLabelProps = ComboboxPrimitive.GroupLabel.Props;

export const ComboboxCollection: React.FC<TComboboxCollectionProps> = (props) => {
	return <ComboboxPrimitive.Collection data-slot="combobox-collection" {...props} />;
};

export type TComboboxCollectionProps = ComboboxPrimitive.Collection.Props;

export const ComboboxStatus: React.FC<TComboboxStatusProps> = (props) => {
	const { className, ...rest } = props;
	const { size } = React.useContext(ComboboxContext);

	return (
		<ComboboxPrimitive.Status
			data-slot="combobox-status"
			data-size={size}
			className={cn(comboboxStatusVariants({ size }), className)}
			{...rest}
		/>
	);
};

const comboboxStatusVariants = cva(
	'text-base-500 border-base-100 bg-base-50/60 border-b font-medium',
	{
		variants: {
			size: {
				default: 'px-2.5 py-1.5 text-[11px]',
				md: 'px-3 py-2 text-xs'
			}
		},
		defaultVariants: {
			size: 'default'
		}
	}
);

export type TComboboxStatusProps = ComboboxPrimitive.Status.Props;

export const ComboboxEmpty: React.FC<TComboboxEmptyProps> = (props) => {
	const { className, ...rest } = props;
	const { size } = React.useContext(ComboboxContext);

	return (
		<ComboboxPrimitive.Empty
			data-slot="combobox-empty"
			data-size={size}
			className={cn(comboboxEmptyVariants({ size }), className)}
			{...rest}
		/>
	);
};

const comboboxEmptyVariants = cva(
	'text-base-500 hidden justify-center text-center group-data-empty/combobox-content:flex',
	{
		variants: {
			size: {
				default: 'px-2.5 py-2.5 text-[13px]',
				md: 'px-3 py-3 text-sm'
			}
		},
		defaultVariants: {
			size: 'default'
		}
	}
);

export type TComboboxEmptyProps = ComboboxPrimitive.Empty.Props;

export const ComboboxSeparator: React.FC<TComboboxSeparatorProps> = (props) => {
	const { className, ...rest } = props;
	const { size } = React.useContext(ComboboxContext);

	return (
		<ComboboxPrimitive.Separator
			data-slot="combobox-separator"
			data-size={size}
			className={cn(comboboxSeparatorVariants({ size }), className)}
			{...rest}
		/>
	);
};

const comboboxSeparatorVariants = cva('bg-base-100 my-1 h-px', {
	variants: {
		size: {
			default: '-mx-0.5',
			md: '-mx-1'
		}
	},
	defaultVariants: {
		size: 'default'
	}
});

export type TComboboxSeparatorProps = ComboboxPrimitive.Separator.Props;

export const ComboboxChips: React.FC<TComboboxChipsProps> = (props) => {
	const { className, ...rest } = props;
	const { size } = React.useContext(ComboboxContext);

	return (
		<ComboboxPrimitive.Chips
			data-slot="combobox-chips"
			data-size={size}
			className={cn(comboboxChipsVariants({ size }), className)}
			{...rest}
		/>
	);
};

const comboboxChipsVariants = cva(
	'border-base-200 bg-base-0 text-base-950 focus-within:border-primary focus-within:ring-primary/30 has-aria-invalid:border-error has-aria-invalid:ring-error/20 flex w-full flex-wrap items-center border transition focus-within:ring-2 has-aria-invalid:ring-2',
	{
		variants: {
			size: {
				default: 'min-h-7 gap-1 rounded-lg px-1.5 py-0.5',
				md: 'min-h-8 gap-1 rounded-lg px-2 py-1'
			}
		},
		defaultVariants: {
			size: 'default'
		}
	}
);

export type TComboboxChipsProps = ComboboxPrimitive.Chips.Props;

export const ComboboxChip: React.FC<TComboboxChipProps> = (props) => {
	const { showRemove = true, children, className, ...rest } = props;
	const { size } = React.useContext(ComboboxContext);

	return (
		<ComboboxPrimitive.Chip
			data-slot="combobox-chip"
			data-size={size}
			className={cn(comboboxChipVariants({ size }), className)}
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

const comboboxChipVariants = cva(
	'bg-base-950/6 text-base-700 inline-flex items-center rounded-md font-medium whitespace-nowrap has-disabled:pointer-events-none has-disabled:opacity-50',
	{
		variants: {
			size: {
				default: 'h-4.5 gap-0.5 pr-0.5 pl-1 text-[11px]',
				md: 'h-5 gap-1 pr-0.5 pl-1.5 text-xs'
			}
		},
		defaultVariants: {
			size: 'default'
		}
	}
);

export type TComboboxChipProps = ComboboxPrimitive.Chip.Props & {
	showRemove?: boolean;
};

export const ComboboxChipsInput: React.FC<TComboboxChipsInputProps> = (props) => {
	const { className, ...rest } = props;
	const { size } = React.useContext(ComboboxContext);

	return (
		<ComboboxPrimitive.Input
			data-slot="combobox-chip-input"
			data-size={size}
			className={cn(comboboxChipsInputVariants({ size }), className)}
			{...rest}
		/>
	);
};

const comboboxChipsInputVariants = cva(
	'placeholder:text-base-400 min-w-12 flex-1 bg-transparent px-0 py-0 outline-none',
	{
		variants: {
			size: {
				default: 'text-[13px]',
				md: 'text-sm'
			}
		},
		defaultVariants: {
			size: 'default'
		}
	}
);

export type TComboboxChipsInputProps = ComboboxPrimitive.Input.Props;

export function useComboboxAnchor() {
	return React.useRef<HTMLDivElement | null>(null);
}
