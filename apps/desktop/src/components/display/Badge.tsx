import { cn } from '@/lib';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';

export const Badge: React.FC<TBadgeProps> = (props) => {
	const { className, variant = 'default', render, ...rest } = props;

	return useRender({
		defaultTagName: 'span',
		props: mergeProps<'span'>({ className: cn(badgeVariants({ variant }), className) }, rest),
		render,
		state: { slot: 'badge', variant }
	});
};

const badgeVariants = cva(
	"inline-flex h-5 shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap select-none transition-[color,box-shadow] focus-ring [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3",
	{
		variants: {
			variant: {
				default: 'bg-primary/10 text-primary',
				secondary: 'bg-secondary/10 text-secondary',
				success: 'bg-success/10 text-success',
				warning: 'bg-warning/10 text-warning',
				destructive: 'bg-error/10 text-error',
				outline: 'border-base-200 text-base-600 [a&]:hover:bg-base-100 [a&]:hover:text-base-950',
				ghost: 'text-base-600 [a&]:hover:bg-base-100 [a&]:hover:text-base-950',
				link: 'text-primary underline-offset-4 [a&]:hover:underline'
			}
		},
		defaultVariants: {
			variant: 'default'
		}
	}
);


type TBadgeProps = useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>;
