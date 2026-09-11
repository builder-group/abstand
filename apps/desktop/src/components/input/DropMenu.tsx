import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import { cva, type VariantProps } from 'class-variance-authority';
import { CheckIcon, ChevronRightIcon } from 'lucide-react';
import React from 'react';
import { cn } from '@/lib';

const DropMenuContext = React.createContext<TDropMenuContext>({
	size: 'sm'
});

interface TDropMenuContext {
	size: TDropMenuSize;
}

type TDropMenuSize = NonNullable<VariantProps<typeof dropMenuContentVariants>['size']>;

export const DropMenu = <GPayload,>(props: TDropMenuProps<GPayload>) => {
	const { size = 'sm', children, ...rest } = props;

	return (
		<DropMenuContext value={{ size }}>
			<MenuPrimitive.Root data-slot="drop-menu" data-size={size} {...rest}>
				{children}
			</MenuPrimitive.Root>
		</DropMenuContext>
	);
};

export type TDropMenuProps<GPayload = unknown> = MenuPrimitive.Root.Props<GPayload> & {
	size?: TDropMenuSize;
};

export const DropMenuTrigger: React.FC<TDropMenuTriggerProps> = (props) => {
	return <MenuPrimitive.Trigger data-slot="drop-menu-trigger" {...props} />;
};

export type TDropMenuTriggerProps = MenuPrimitive.Trigger.Props;

export const DropMenuPortal: React.FC<TDropMenuPortalProps> = (props) => {
	return <MenuPrimitive.Portal data-slot="drop-menu-portal" {...props} />;
};

export type TDropMenuPortalProps = MenuPrimitive.Portal.Props;

export const DropMenuContent: React.FC<TDropMenuContentProps> = (props) => {
	const {
		side = 'bottom',
		sideOffset = 6,
		align = 'start',
		alignOffset = 0,
		anchor,
		className,
		...rest
	} = props;
	const { size } = React.use(DropMenuContext);

	return (
		<DropMenuPortal>
			<MenuPrimitive.Positioner
				side={side}
				sideOffset={sideOffset}
				align={align}
				alignOffset={alignOffset}
				anchor={anchor}
				className="isolate z-50 outline-none"
			>
				<MenuPrimitive.Popup
					data-slot="drop-menu-content"
					data-size={size}
					className={cn(dropMenuContentVariants({ size }), className)}
					{...rest}
				/>
			</MenuPrimitive.Positioner>
		</DropMenuPortal>
	);
};

export type TDropMenuContentProps = MenuPrimitive.Popup.Props &
	Pick<MenuPrimitive.Positioner.Props, 'side' | 'align' | 'sideOffset' | 'alignOffset' | 'anchor'>;

const dropMenuContentVariants = cva(
	'bg-base-0/90 supports-backdrop-filter:bg-base-0/80 text-base-950 border-base-100 data-[side=bottom]:slide-in-from-top-1 data-[side=inline-end]:slide-in-from-left-1 data-[side=inline-start]:slide-in-from-right-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 max-h-[min(18rem,var(--available-height))] max-w-(--available-width) min-w-40 origin-(--transform-origin) overflow-x-hidden overflow-y-auto overscroll-contain border p-1 shadow-xl duration-100 outline-none supports-backdrop-filter:backdrop-blur-xl',
	{
		variants: {
			size: {
				sm: 'rounded-xl',
				md: 'rounded-xl'
			}
		},
		defaultVariants: {
			size: 'sm'
		}
	}
);

export const DropMenuGroup: React.FC<TDropMenuGroupProps> = (props) => {
	return <MenuPrimitive.Group data-slot="drop-menu-group" {...props} />;
};

export type TDropMenuGroupProps = MenuPrimitive.Group.Props;

export const DropMenuLabel: React.FC<TDropMenuLabelProps> = (props) => {
	const { inset = false, className, ...rest } = props;
	const { size } = React.use(DropMenuContext);

	return (
		<MenuPrimitive.GroupLabel
			data-slot="drop-menu-label"
			data-size={size}
			data-inset={inset ? '' : undefined}
			className={cn(dropMenuLabelVariants({ size, inset }), className)}
			{...rest}
		/>
	);
};

export type TDropMenuLabelProps = MenuPrimitive.GroupLabel.Props &
	Omit<VariantProps<typeof dropMenuLabelVariants>, 'size'>;

const dropMenuLabelVariants = cva('text-base-500 font-medium', {
	variants: {
		size: {
			sm: 'px-2 py-1 text-xs',
			md: 'px-2.5 py-1.25 text-xs'
		},
		inset: {
			true: '',
			false: ''
		}
	},
	compoundVariants: [
		{ size: 'sm', inset: true, className: 'pl-7' },
		{ size: 'md', inset: true, className: 'pl-8' }
	],
	defaultVariants: {
		size: 'sm',
		inset: false
	}
});

export const DropMenuItem: React.FC<TDropMenuItemProps> = (props) => {
	const { variant = 'default', inset = false, className, ...rest } = props;
	const { size } = React.use(DropMenuContext);

	return (
		<MenuPrimitive.Item
			data-slot="drop-menu-item"
			data-size={size}
			data-variant={variant}
			data-inset={inset ? '' : undefined}
			className={cn(dropMenuItemVariants({ size, variant, inset }), className)}
			{...rest}
		/>
	);
};

export type TDropMenuItemProps = MenuPrimitive.Item.Props &
	Omit<VariantProps<typeof dropMenuItemVariants>, 'size'>;

const dropMenuItemVariants = cva(
	'group/drop-menu-item active:bg-base-950/10 relative flex w-full cursor-default items-center border border-transparent transition-colors outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&>svg]:pointer-events-none [&>svg]:shrink-0',
	{
		variants: {
			variant: {
				default: 'text-base-600 data-highlighted:bg-base-950/6 data-highlighted:text-base-950',
				destructive:
					'text-error data-highlighted:bg-error/10 data-highlighted:text-error active:bg-error/15'
			},
			size: {
				sm: "min-h-7 gap-2 rounded-lg px-2 py-1 text-sm [&>svg:not([class*='size-'])]:size-3.5",
				md: "min-h-8 gap-2 rounded-lg px-2.5 py-1.5 text-sm [&>svg:not([class*='size-'])]:size-4"
			},
			inset: {
				true: '',
				false: ''
			}
		},
		compoundVariants: [
			{ size: 'sm', inset: true, className: 'pl-7' },
			{ size: 'md', inset: true, className: 'pl-8' }
		],
		defaultVariants: {
			variant: 'default',
			size: 'sm',
			inset: false
		}
	}
);

export const DropMenuSub: React.FC<TDropMenuSubProps> = (props) => {
	return <MenuPrimitive.SubmenuRoot data-slot="drop-menu-sub" {...props} />;
};

export type TDropMenuSubProps = MenuPrimitive.SubmenuRoot.Props;

export const DropMenuSubTrigger: React.FC<TDropMenuSubTriggerProps> = (props) => {
	const { inset = false, children, className, ...rest } = props;
	const { size } = React.use(DropMenuContext);

	return (
		<MenuPrimitive.SubmenuTrigger
			data-slot="drop-menu-sub-trigger"
			data-size={size}
			data-inset={inset ? '' : undefined}
			className={cn(dropMenuSubTriggerVariants({ size, inset }), className)}
			{...rest}
		>
			{children}
			<ChevronRightIcon aria-hidden className="text-base-400 ml-auto" />
		</MenuPrimitive.SubmenuTrigger>
	);
};

export type TDropMenuSubTriggerProps = MenuPrimitive.SubmenuTrigger.Props &
	Omit<VariantProps<typeof dropMenuSubTriggerVariants>, 'size'>;

const dropMenuSubTriggerVariants = cva(
	'group/drop-menu-sub-trigger text-base-600 data-highlighted:bg-base-950/6 data-highlighted:text-base-950 data-popup-open:bg-base-950/6 data-popup-open:text-base-950 active:bg-base-950/10 relative flex w-full cursor-default items-center border border-transparent transition-colors outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&>svg]:pointer-events-none [&>svg]:shrink-0',
	{
		variants: {
			size: {
				sm: "min-h-7 gap-2 rounded-lg px-2 py-1 text-sm [&>svg:not([class*='size-'])]:size-3.5",
				md: "min-h-8 gap-2 rounded-lg px-2.5 py-1.5 text-sm [&>svg:not([class*='size-'])]:size-4"
			},
			inset: {
				true: '',
				false: ''
			}
		},
		compoundVariants: [
			{ size: 'sm', inset: true, className: 'pl-7' },
			{ size: 'md', inset: true, className: 'pl-8' }
		],
		defaultVariants: {
			size: 'sm',
			inset: false
		}
	}
);

export const DropMenuSubContent: React.FC<TDropMenuSubContentProps> = (props) => {
	const {
		side = 'right',
		sideOffset = 2,
		align = 'start',
		alignOffset = -4,
		className,
		...rest
	} = props;

	return (
		<DropMenuContent
			data-slot="drop-menu-sub-content"
			side={side}
			sideOffset={sideOffset}
			align={align}
			alignOffset={alignOffset}
			className={cn('min-w-36', className)}
			{...rest}
		/>
	);
};

export type TDropMenuSubContentProps = TDropMenuContentProps;

export const DropMenuCheckboxItem: React.FC<TDropMenuCheckboxItemProps> = (props) => {
	const { children, className, ...rest } = props;
	const { size } = React.use(DropMenuContext);

	return (
		<MenuPrimitive.CheckboxItem
			data-slot="drop-menu-checkbox-item"
			data-size={size}
			className={cn(dropMenuChoiceItemVariants({ size }), className)}
			{...rest}
		>
			<span
				data-slot="drop-menu-item-indicator"
				className={dropMenuChoiceIndicatorVariants({ size })}
			>
				<MenuPrimitive.CheckboxItemIndicator>
					<CheckIcon className={dropMenuChoiceCheckIconVariants({ size })} />
				</MenuPrimitive.CheckboxItemIndicator>
			</span>
			{children}
		</MenuPrimitive.CheckboxItem>
	);
};

export type TDropMenuCheckboxItemProps = MenuPrimitive.CheckboxItem.Props;

export const DropMenuRadioGroup: React.FC<TDropMenuRadioGroupProps> = (props) => {
	return <MenuPrimitive.RadioGroup data-slot="drop-menu-radio-group" {...props} />;
};

export type TDropMenuRadioGroupProps = MenuPrimitive.RadioGroup.Props;

export const DropMenuRadioItem: React.FC<TDropMenuRadioItemProps> = (props) => {
	const { children, className, ...rest } = props;
	const { size } = React.use(DropMenuContext);

	return (
		<MenuPrimitive.RadioItem
			data-slot="drop-menu-radio-item"
			data-size={size}
			className={cn(dropMenuChoiceItemVariants({ size }), className)}
			{...rest}
		>
			<span
				data-slot="drop-menu-item-indicator"
				className={dropMenuChoiceIndicatorVariants({ size })}
			>
				<MenuPrimitive.RadioItemIndicator>
					<CheckIcon className={dropMenuChoiceCheckIconVariants({ size })} />
				</MenuPrimitive.RadioItemIndicator>
			</span>
			{children}
		</MenuPrimitive.RadioItem>
	);
};

export type TDropMenuRadioItemProps = MenuPrimitive.RadioItem.Props;

const dropMenuChoiceItemVariants = cva(
	'group/drop-menu-choice-item text-base-600 data-highlighted:bg-base-950/6 data-highlighted:text-base-950 active:bg-base-950/10 relative flex w-full cursor-default items-center border border-transparent transition-colors outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&>svg]:pointer-events-none [&>svg]:shrink-0',
	{
		variants: {
			size: {
				sm: "min-h-7 gap-2 rounded-lg py-1 pr-2 pl-7 text-sm [&>svg:not([class*='size-'])]:size-3.5",
				md: "min-h-8 gap-2 rounded-lg py-1.5 pr-2.5 pl-8 text-sm [&>svg:not([class*='size-'])]:size-4"
			}
		},
		defaultVariants: {
			size: 'sm'
		}
	}
);

const dropMenuChoiceIndicatorVariants = cva(
	'text-primary pointer-events-none absolute flex items-center justify-center',
	{
		variants: {
			size: {
				sm: 'left-2 size-3.5',
				md: 'left-2.5 size-4'
			}
		},
		defaultVariants: {
			size: 'sm'
		}
	}
);

const dropMenuChoiceCheckIconVariants = cva('pointer-events-none shrink-0', {
	variants: {
		size: {
			sm: 'size-3.5',
			md: 'size-4'
		}
	},
	defaultVariants: {
		size: 'sm'
	}
});

export const DropMenuSeparator: React.FC<TDropMenuSeparatorProps> = (props) => {
	const { className, ...rest } = props;
	const { size } = React.use(DropMenuContext);

	return (
		<MenuPrimitive.Separator
			data-slot="drop-menu-separator"
			data-size={size}
			className={cn(dropMenuSeparatorVariants({ size }), className)}
			{...rest}
		/>
	);
};

export type TDropMenuSeparatorProps = MenuPrimitive.Separator.Props;

const dropMenuSeparatorVariants = cva('bg-base-100 my-1 h-px', {
	variants: {
		size: {
			sm: '-mx-1',
			md: '-mx-1'
		}
	},
	defaultVariants: {
		size: 'sm'
	}
});

export const DropMenuShortcut: React.FC<TDropMenuShortcutProps> = (props) => {
	const { className, ...rest } = props;
	const { size } = React.use(DropMenuContext);

	return (
		<span
			data-slot="drop-menu-shortcut"
			data-size={size}
			className={cn(dropMenuShortcutVariants({ size }), className)}
			{...rest}
		/>
	);
};

export type TDropMenuShortcutProps = React.ComponentProps<'span'>;

const dropMenuShortcutVariants = cva('text-base-400 ml-auto pl-6 text-right tabular-nums', {
	variants: {
		size: {
			sm: 'text-xs',
			md: 'text-xs'
		}
	},
	defaultVariants: {
		size: 'sm'
	}
});
