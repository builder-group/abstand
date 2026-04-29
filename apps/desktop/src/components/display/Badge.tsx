import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';

export const Badge: React.FC<TBadgeProps> = (props) => {
	const { className, variant = 'default', size = 'default', render, ...rest } = props;

	return useRender({
		defaultTagName: 'span',
		props: mergeProps<'span'>({ className: cn(badgeVariants({ variant, size }), className) }, rest),
		render,
		state: { slot: 'badge', variant, size }
	});
};

const badgeVariants = cva(
	'inline-flex shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent font-medium whitespace-nowrap select-none transition-[color,box-shadow] focus-ring [&_svg]:pointer-events-none [&_svg]:shrink-0',
	{
		variants: {
			variant: {
				default: 'bg-primary/10 text-primary',
				secondary: 'bg-secondary/10 text-secondary',
				success: 'bg-success/10 text-success',
				warning: 'bg-warning/10 text-warning',
				destructive: 'bg-error/10 text-error',
				outline: 'border-base-200 text-base-600 [a&]:hover:bg-base-950/6 [a&]:hover:text-base-950',
				ghost: 'text-base-600 [a&]:hover:bg-base-950/6 [a&]:hover:text-base-950',
				link: 'text-primary underline-offset-4 [a&]:hover:underline'
			},
			size: {
				default: "h-5 px-2 py-0.5 text-xs [&_svg:not([class*='size-'])]:size-3",
				sm: "h-4 px-1.5 text-[10px] [&_svg:not([class*='size-'])]:size-2.5"
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	}
);

export type TBadgeProps = useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>;
