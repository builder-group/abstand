import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';

export const Button: React.FC<TButtonProps> = (props) => {
	const { className, variant = 'default', size = 'default', ...rest } = props;

	return (
		<ButtonPrimitive
			data-slot="button"
			data-size={size}
			data-variant={variant}
			className={cn(buttonVariants({ variant, size }), className)}
			{...rest}
		/>
	);
};

const buttonVariants = cva(
	"inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition select-none focus-ring active:not-aria-[haspopup]:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 invalid-ring [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	{
		variants: {
			variant: {
				default: 'bg-base-100 text-base-950 hover:bg-base-200 aria-expanded:bg-base-200',
				primary: 'bg-primary text-primary-content hover:bg-primary/90 aria-expanded:bg-primary/90',
				secondary:
					'bg-secondary/15 text-secondary hover:bg-secondary/22 aria-expanded:bg-secondary/22',
				destructive:
					'bg-error/10 text-error hover:bg-error/18 focus-visible:border-error/40 focus-visible:ring-error/20',
				ghost:
					'text-base-600 hover:bg-base-950/6 hover:text-base-950 aria-expanded:bg-base-950/6 aria-expanded:text-base-950',
				outline:
					'border-base-200 bg-transparent text-base-600 hover:bg-base-950/6 hover:text-base-950 aria-expanded:bg-base-950/6 aria-expanded:text-base-950',
				link: 'text-primary underline-offset-4 hover:underline'
			},
			size: {
				'default': 'h-8 gap-1.5 px-3 has-[>svg]:px-2.5',
				'xs': "h-6 gap-1 px-2.5 text-xs has-[>svg]:px-2 [&_svg:not([class*='size-'])]:size-3",
				'sm': "h-7 gap-1 px-2.5 text-xs has-[>svg]:px-2 [&_svg:not([class*='size-'])]:size-3.5",
				'lg': 'h-9 gap-1.5 px-3.5 has-[>svg]:px-3',
				'icon': 'size-8 rounded-full',
				'icon-xs': "size-6 rounded-full [&_svg:not([class*='size-'])]:size-3",
				'icon-sm': "size-7 rounded-full [&_svg:not([class*='size-'])]:size-3.5",
				'icon-lg': 'size-9 rounded-full'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	}
);

type TButtonProps = ButtonPrimitive.Props & VariantProps<typeof buttonVariants>;
