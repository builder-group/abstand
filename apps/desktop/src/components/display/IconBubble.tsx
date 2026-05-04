import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';

export const IconBubble: React.FC<TIconBubbleProps> = (props) => {
	const { variant = 'default', size = 'default', children, className, ...rest } = props;

	return (
		<span
			data-slot="icon-bubble"
			data-size={size}
			data-variant={variant}
			className={cn(iconBubbleVariants({ variant, size }), className)}
			{...rest}
		>
			{children}
		</span>
	);
};

const iconBubbleVariants = cva(
	'relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_1px_2px_rgba(0,0,0,0.12)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-linear-to-b before:from-white/20 before:to-transparent [&>svg]:pointer-events-none [&>svg]:shrink-0',
	{
		variants: {
			variant: {
				default: 'bg-primary text-white',
				secondary: 'bg-secondary text-white',
				success: 'bg-success text-white',
				warning: 'bg-warning text-white',
				destructive: 'bg-error text-white',
				neutral: 'bg-base-950 text-base-0'
			},
			size: {
				xs: "size-5 rounded-md [&>svg:not([class*='size-'])]:size-3.5",
				default: "size-7 rounded-lg [&>svg:not([class*='size-'])]:size-5",
				md: "size-8 rounded-lg [&>svg:not([class*='size-'])]:size-6"
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	}
);

export type TIconBubbleProps = React.ComponentPropsWithoutRef<'span'> &
	VariantProps<typeof iconBubbleVariants>;
