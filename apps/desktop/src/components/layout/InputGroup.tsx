import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';
import { Button, Input, Textarea } from '../input';

export const InputGroup: React.FC<TInputGroupProps> = (props) => {
	const { className, ...rest } = props;

	return (
		<div
			data-slot="input-group"
			role="group"
			className={cn(inputGroupVariants(), className)}
			{...rest}
		/>
	);
};

const inputGroupVariants = cva(
	'group/input-group border-base-200 bg-base-0 text-base-950 relative flex min-h-8 w-full min-w-0 items-center rounded-lg border bg-clip-padding transition has-[[data-slot=input-group-control]:focus-visible]:border-primary has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-primary/30 has-[[data-slot=input-group-control][aria-invalid=true]]:border-error has-[[data-slot=input-group-control][aria-invalid=true]]:ring-2 has-[[data-slot=input-group-control][aria-invalid=true]]:ring-error/20 has-[>[data-align=block-end]]:items-stretch has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:items-stretch has-[>[data-align=block-start]]:flex-col has-[textarea]:items-stretch has-disabled:opacity-50'
);
export type TInputGroupProps = React.ComponentProps<'div'>;

export const InputGroupAddon: React.FC<TInputGroupAddonProps> = (props) => {
	const { className, align = 'inline-start', onClick, ...rest } = props;

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
			className={cn(inputGroupAddonVariants({ align }), className)}
			onClick={handleClick}
			{...rest}
		/>
	);
};

const inputGroupAddonVariants = cva(
	"text-base-500 flex shrink-0 cursor-text items-center gap-1.5 font-medium select-none [&>kbd]:rounded-md [&>svg]:shrink-0 [&>svg:not([class*='size-'])]:size-4",
	{
		variants: {
			align: {
				'inline-start': 'order-first pl-2',
				'inline-end': 'order-last pr-2',
				'block-start': 'order-first w-full px-2.5 pt-2',
				'block-end': 'order-last w-full px-2.5 pb-2'
			}
		},
		defaultVariants: {
			align: 'inline-start'
		}
	}
);

export type TInputGroupAddonProps = React.ComponentProps<'div'> &
	VariantProps<typeof inputGroupAddonVariants>;

export const InputGroupButton: React.FC<TInputGroupButtonProps> = (props) => {
	const { className, type = 'button', variant = 'ghost', size = 'icon-xs', ...rest } = props;

	return (
		<Button
			data-slot="input-group-button"
			type={type}
			variant={variant}
			size={size}
			className={cn('shrink-0 rounded-md shadow-none', className)}
			{...rest}
		/>
	);
};

export type TInputGroupButtonProps = Omit<React.ComponentProps<typeof Button>, 'type'> & {
	type?: 'button' | 'submit' | 'reset';
};

export const InputGroupText: React.FC<TInputGroupTextProps> = (props) => {
	const { className, ...rest } = props;

	return (
		<span
			data-slot="input-group-text"
			className={cn(
				"text-base-500 flex items-center gap-1.5 text-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
				className
			)}
			{...rest}
		/>
	);
};

export type TInputGroupTextProps = React.ComponentProps<'span'>;

export const InputGroupInput: React.FC<TInputGroupInputProps> = (props) => {
	const { className, size = 'default', ...rest } = props;

	return (
		<Input
			size={size}
			data-slot="input-group-control"
			className={cn(inputGroupInputVariants({ size }), className)}
			{...rest}
		/>
	);
};

export type TInputGroupInputProps = React.ComponentProps<typeof Input>;

const inputGroupInputVariants = cva(
	'min-w-0 flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0',
	{
		variants: {
			// Note: Standalone Input sizes include its own border. Inside InputGroup the wrapper owns the border,
			// so the inner control is 2px shorter to keep the overall rendered height aligned.
			size: {
				default: 'h-[calc(--spacing(8)-2px)]',
				sm: 'h-[calc(--spacing(7)-2px)]'
			}
		},
		defaultVariants: {
			size: 'default'
		}
	}
);

export const InputGroupTextarea: React.FC<TInputGroupTextareaProps> = (props) => {
	const { className, ...rest } = props;

	return (
		<Textarea
			data-slot="input-group-control"
			className={cn(
				'min-h-0 flex-1 resize-none rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0',
				className
			)}
			{...rest}
		/>
	);
};

export type TInputGroupTextareaProps = React.ComponentProps<typeof Textarea>;
