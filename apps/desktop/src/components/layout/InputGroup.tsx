import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';
import { Button, Input, Textarea } from '../input';

const InputGroupContext = React.createContext<TInputGroupContext>({
	size: 'default'
});

interface TInputGroupContext {
	size: TInputGroupSize;
}

type TInputGroupSize = NonNullable<VariantProps<typeof inputGroupVariants>['size']>;

export const InputGroup: React.FC<TInputGroupProps> = (props) => {
	const { size = 'default', className, ...rest } = props;

	return (
		<InputGroupContext.Provider value={{ size }}>
			<div
				data-slot="input-group"
				data-size={size}
				role="group"
				className={cn(inputGroupVariants({ size }), className)}
				{...rest}
			/>
		</InputGroupContext.Provider>
	);
};

const inputGroupVariants = cva(
	'group/input-group border-base-200 bg-base-0 text-base-950 has-[[data-slot=input-group-control]:focus-visible]:border-primary has-[[data-slot=input-group-control]:focus-visible]:ring-primary/30 has-[[data-slot=input-group-control][aria-invalid=true]]:border-error has-[[data-slot=input-group-control][aria-invalid=true]]:ring-error/20 relative flex w-full min-w-0 items-center rounded-lg border bg-clip-padding transition has-disabled:opacity-50 has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control][aria-invalid=true]]:ring-2 has-[textarea]:items-stretch has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:items-stretch has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:items-stretch has-[>textarea]:h-auto',
	{
		variants: {
			size: {
				default: 'h-8',
				sm: 'h-7'
			}
		},
		defaultVariants: {
			size: 'default'
		}
	}
);

export interface TInputGroupProps extends React.ComponentProps<'div'> {
	size?: TInputGroupSize;
}

export const InputGroupAddon: React.FC<TInputGroupAddonProps> = (props) => {
	const { align = 'inline-start', onClick, className, ...rest } = props;
	const { size } = React.useContext(InputGroupContext);

	const handleClick = React.useCallback(
		(event: React.MouseEvent<HTMLDivElement>) => {
			onClick?.(event);
			if (event.defaultPrevented || (event.target as HTMLElement).closest('button')) {
				return;
			}

			event.currentTarget.parentElement
				?.querySelector<HTMLElement>('[data-slot="input-group-control"]')
				?.focus();
		},
		[onClick]
	);

	return (
		<div
			role="group"
			data-slot="input-group-addon"
			data-align={align}
			data-size={size}
			className={cn(inputGroupAddonVariants({ align, size }), className)}
			onClick={handleClick}
			{...rest}
		/>
	);
};

const inputGroupAddonVariants = cva(
	'text-base-500 flex shrink-0 cursor-text items-center font-medium select-none [&>kbd]:rounded-md [&>svg]:shrink-0',
	{
		variants: {
			size: {
				default: "gap-1.5 [&>svg:not([class*='size-'])]:size-4",
				sm: "gap-1 [&>svg:not([class*='size-'])]:size-3.5"
			},
			align: {
				'inline-start': 'order-first pl-2',
				'inline-end': 'order-last pr-2',
				'block-start': 'order-first w-full px-2.5 pt-2',
				'block-end': 'order-last w-full px-2.5 pb-2'
			}
		},
		defaultVariants: {
			size: 'default',
			align: 'inline-start'
		}
	}
);

export type TInputGroupAddonProps = React.ComponentProps<'div'> &
	Omit<VariantProps<typeof inputGroupAddonVariants>, 'size'>;

export const InputGroupButton: React.FC<TInputGroupButtonProps> = (props) => {
	const { variant = 'ghost', type = 'button', className, ...rest } = props;

	return (
		<Button
			data-slot="input-group-button"
			type={type}
			variant={variant}
			size="icon-xs"
			className={cn('shrink-0 rounded-md shadow-none', className)}
			{...rest}
		/>
	);
};

export type TInputGroupButtonProps = Omit<React.ComponentProps<typeof Button>, 'size' | 'type'> & {
	type?: 'button' | 'submit' | 'reset';
};

export const InputGroupText: React.FC<TInputGroupTextProps> = (props) => {
	const { className, ...rest } = props;
	const { size } = React.useContext(InputGroupContext);

	return (
		<span
			data-slot="input-group-text"
			data-size={size}
			className={cn(inputGroupTextVariants({ size }), className)}
			{...rest}
		/>
	);
};

const inputGroupTextVariants = cva(
	'text-base-500 flex items-center [&_svg]:pointer-events-none [&_svg]:shrink-0',
	{
		variants: {
			size: {
				default: "gap-1.5 text-sm [&_svg:not([class*='size-'])]:size-4",
				sm: "gap-1 text-xs [&_svg:not([class*='size-'])]:size-3.5"
			}
		},
		defaultVariants: {
			size: 'default'
		}
	}
);

export type TInputGroupTextProps = React.ComponentProps<'span'>;

export const InputGroupInput: React.FC<TInputGroupInputProps> = (props) => {
	const { className, ...rest } = props;
	const { size } = React.useContext(InputGroupContext);

	return (
		<Input
			data-slot="input-group-control"
			size={size}
			className={cn(
				'h-full min-w-0 flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0',
				className
			)}
			{...rest}
		/>
	);
};

export type TInputGroupInputProps = Omit<React.ComponentProps<typeof Input>, 'size'>;

export const InputGroupTextarea: React.FC<TInputGroupTextareaProps> = (props) => {
	const { className, ...rest } = props;
	const { size } = React.useContext(InputGroupContext);

	return (
		<Textarea
			data-slot="input-group-control"
			size={size}
			className={cn(
				'min-h-0 flex-1 resize-none rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0',
				className
			)}
			{...rest}
		/>
	);
};

export type TInputGroupTextareaProps = Omit<React.ComponentProps<typeof Textarea>, 'size'>;
