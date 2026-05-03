import { Toggle as TogglePrimitive } from '@base-ui/react/toggle';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';

export const Toggle: React.FC<TToggleProps> = (props) => {
	const { variant = 'default', size = 'default', className, ...rest } = props;

	return (
		<TogglePrimitive
			data-slot="toggle"
			data-variant={variant}
			data-size={size}
			className={cn(toggleVariants({ variant, size }), className)}
			{...rest}
		/>
	);
};

const toggleVariants = cva(
	'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-transparent font-medium whitespace-nowrap transition select-none hover:bg-base-950/6 focus-ring active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 aria-pressed:bg-base-950/10 [&_svg]:pointer-events-none [&_svg]:shrink-0',
	{
		variants: {
			variant: {
				default: 'bg-transparent text-base-500 hover:text-base-950 aria-pressed:text-base-950',
				// The icon communicates state; appearance stays the same whether pressed or not
				icon: 'bg-transparent text-base-500 hover:text-base-950 aria-pressed:bg-transparent aria-pressed:text-base-500 hover:aria-pressed:bg-base-950/6 hover:aria-pressed:text-base-950',
				outline:
					'border border-base-200 bg-transparent text-base-500 hover:text-base-950 aria-pressed:text-base-950'
			},
			size: {
				'default': "h-8 min-w-8 px-2 text-sm [&_svg:not([class*='size-'])]:size-4",
				'sm': "h-7 min-w-7 px-1.5 text-xs [&_svg:not([class*='size-'])]:size-3.5",
				'lg': "h-9 min-w-9 px-2.5 text-sm [&_svg:not([class*='size-'])]:size-4",
				'icon': "size-8 rounded-full [&_svg:not([class*='size-'])]:size-4",
				'icon-sm': "size-7 rounded-full [&_svg:not([class*='size-'])]:size-3.5",
				'icon-lg': "size-9 rounded-full [&_svg:not([class*='size-'])]:size-4"
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	}
);

export type TToggleProps = TogglePrimitive.Props & VariantProps<typeof toggleVariants>;
