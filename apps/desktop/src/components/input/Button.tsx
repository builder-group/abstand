import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';

export const Button: React.FC<TButtonProps> = (props) => {
	const { variant = 'default', size = 'sm', className, ...rest } = props;

	return (
		<ButtonPrimitive
			data-slot="button"
			data-variant={variant}
			data-size={size}
			className={cn(buttonVariants({ variant, size }), className)}
			{...rest}
		/>
	);
};

export type TButtonProps = ButtonPrimitive.Props & VariantProps<typeof buttonVariants>;

const buttonVariants = cva(
	'focus-ring invalid-ring inline-flex shrink-0 items-center justify-center border border-transparent whitespace-nowrap transition select-none active:not-aria-[haspopup]:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
	{
		variants: {
			variant: {
				default: 'bg-base-100 text-base-950 hover:bg-base-200 aria-expanded:bg-base-200',
				primary: 'bg-primary text-primary-content hover:bg-primary/90 aria-expanded:bg-primary/90',
				secondary:
					'bg-secondary/15 text-secondary hover:bg-secondary/22 aria-expanded:bg-secondary/22',
				destructive:
					'bg-error/10 text-error hover:bg-error/18 focus-visible:border-error/40 focus-visible:ring-error/20',
				soft: 'bg-base-950/6 text-base-600 hover:bg-base-950/10 hover:text-base-950 aria-expanded:bg-base-950/10 aria-expanded:text-base-950',
				ghost:
					'text-base-600 hover:bg-base-950/6 hover:text-base-950 aria-expanded:bg-base-950/6 aria-expanded:text-base-950',
				outline:
					'border-base-200 text-base-600 hover:bg-base-950/6 hover:text-base-950 aria-expanded:bg-base-950/6 aria-expanded:text-base-950 bg-transparent',
				link: 'text-primary underline-offset-4 hover:underline'
			},
			size: {
				'sm': "h-7 gap-1 rounded-lg px-2.5 text-sm has-[>svg]:px-2 [&_svg:not([class*='size-'])]:size-3.5",
				'md': "h-8 gap-1.5 rounded-lg px-3 text-sm has-[>svg]:px-2.5 [&_svg:not([class*='size-'])]:size-4",
				'icon-xs': "size-5 rounded-full [&_svg:not([class*='size-'])]:size-3.5",
				'icon-sm': "size-7 rounded-full [&_svg:not([class*='size-'])]:size-3.5",
				'icon-md': "size-8 rounded-full [&_svg:not([class*='size-'])]:size-4"
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'sm'
		}
	}
);
