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
	'hover:bg-base-950/6 focus-ring aria-pressed:bg-base-950/10 inline-flex shrink-0 items-center justify-center border border-transparent font-medium whitespace-nowrap transition select-none active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
	{
		variants: {
			variant: {
				default: 'text-base-500 hover:text-base-950 aria-pressed:text-base-950 bg-transparent',
				// Note: The icon communicates state while appearance stays the same whether pressed or not
				icon: 'text-base-500 hover:text-base-950 aria-pressed:text-base-500 hover:aria-pressed:bg-base-950/6 hover:aria-pressed:text-base-950 bg-transparent aria-pressed:bg-transparent',
				outline:
					'border-base-200 text-base-500 hover:text-base-950 aria-pressed:text-base-950 border bg-transparent'
			},
			size: {
				'default':
					"h-7 min-w-7 gap-1 rounded-lg px-1.5 text-[13px] [&_svg:not([class*='size-'])]:size-3.5",
				'md': "h-8 min-w-8 gap-1.5 rounded-lg px-2 text-sm [&_svg:not([class*='size-'])]:size-4",
				'icon': "size-7 rounded-full [&_svg:not([class*='size-'])]:size-3.5",
				'icon-md': "size-8 rounded-full [&_svg:not([class*='size-'])]:size-4"
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	}
);

export type TToggleProps = TogglePrimitive.Props & VariantProps<typeof toggleVariants>;
