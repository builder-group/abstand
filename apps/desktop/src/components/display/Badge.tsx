import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';

export const Badge: React.FC<TBadgeProps> = (props) => {
	const { variant = 'default', size = 'sm', render, children, className, ...rest } = props;

	return useRender({
		defaultTagName: 'span',
		props: mergeProps<'span'>(
			{
				className: cn(badgeVariants({ variant, size }), className),
				children
			},
			rest
		),
		render,
		state: { slot: 'badge', variant, size }
	});
};

export type TBadgeProps = useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>;

const badgeVariants = cva(
	'focus-ring inline-flex shrink-0 items-center justify-center overflow-hidden border border-transparent font-medium whitespace-nowrap transition-colors select-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
	{
		variants: {
			variant: {
				default: 'bg-base-950/6 text-base-500',
				primary: 'bg-primary/10 text-primary',
				secondary: 'bg-secondary/10 text-secondary',
				success: 'bg-success/10 text-success',
				warning: 'bg-warning/10 text-warning',
				destructive: 'bg-error/10 text-error',
				outline: 'border-base-200 text-base-600 [a&]:hover:bg-base-950/6 [a&]:hover:text-base-950',
				ghost: 'text-base-600 [a&]:hover:bg-base-950/6 [a&]:hover:text-base-950',
				link: 'text-primary underline-offset-4 [a&]:hover:underline'
			},
			size: {
				xs: "h-3.5 gap-1 rounded-full px-1.5 text-xs [&_svg:not([class*='size-'])]:size-3",
				sm: "h-4.5 gap-1 rounded-full px-1.5 text-xs [&_svg:not([class*='size-'])]:size-3",
				md: "h-5 gap-1 rounded-full px-2 py-0.5 text-xs [&_svg:not([class*='size-'])]:size-3.5"
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'sm'
		}
	}
);
