import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import React from 'react';
import { cn } from '@/lib';

export const Popover: React.FC<TPopoverProps> = (props) => {
	return <PopoverPrimitive.Root data-slot="popover" {...props} />;
};

export type TPopoverProps = PopoverPrimitive.Root.Props;

export const PopoverTrigger: React.FC<TPopoverTriggerProps> = (props) => {
	return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
};

export type TPopoverTriggerProps = PopoverPrimitive.Trigger.Props;

export const PopoverContent: React.FC<TPopoverContentProps> = (props) => {
	const {
		side = 'bottom',
		sideOffset = 6,
		align = 'center',
		alignOffset = 0,
		anchor,
		className,
		...rest
	} = props;

	return (
		<PopoverPrimitive.Portal>
			<PopoverPrimitive.Positioner
				side={side}
				sideOffset={sideOffset}
				align={align}
				alignOffset={alignOffset}
				anchor={anchor}
				className="isolate z-50"
			>
				<PopoverPrimitive.Popup
					data-slot="popover-content"
					className={cn(
						'bg-base-0/90 supports-backdrop-filter:bg-base-0/80 text-base-950 border-base-100 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 flex max-h-(--available-height) w-72 max-w-(--available-width) origin-(--transform-origin) flex-col gap-2 overflow-y-auto rounded-xl border p-2.5 text-sm shadow-xl duration-100 outline-none supports-backdrop-filter:backdrop-blur-xl',
						className
					)}
					{...rest}
				/>
			</PopoverPrimitive.Positioner>
		</PopoverPrimitive.Portal>
	);
};

export type TPopoverContentProps = PopoverPrimitive.Popup.Props &
	Pick<
		PopoverPrimitive.Positioner.Props,
		'side' | 'align' | 'sideOffset' | 'alignOffset' | 'anchor'
	>;

export const PopoverHeader: React.FC<TPopoverHeaderProps> = (props) => {
	const { className, ...rest } = props;

	return (
		<div
			data-slot="popover-header"
			className={cn('flex flex-col gap-0.5 text-sm', className)}
			{...rest}
		/>
	);
};

export type TPopoverHeaderProps = React.ComponentProps<'div'>;

export const PopoverTitle: React.FC<TPopoverTitleProps> = (props) => {
	const { className, ...rest } = props;

	return (
		<PopoverPrimitive.Title
			data-slot="popover-title"
			className={cn('font-medium', className)}
			{...rest}
		/>
	);
};

export type TPopoverTitleProps = PopoverPrimitive.Title.Props;

export const PopoverDescription: React.FC<TPopoverDescriptionProps> = (props) => {
	const { className, ...rest } = props;

	return (
		<PopoverPrimitive.Description
			data-slot="popover-description"
			className={cn('text-base-500', className)}
			{...rest}
		/>
	);
};

export type TPopoverDescriptionProps = PopoverPrimitive.Description.Props;
