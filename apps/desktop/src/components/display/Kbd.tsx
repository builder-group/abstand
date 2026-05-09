import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';

export const Kbd: React.FC<TKbdProps> = (props) => {
	const { variant = 'default', size = 'sm', children, className, ...rest } = props;

	return (
		<kbd
			data-slot="kbd"
			data-size={size}
			data-variant={variant}
			className={cn(kbdVariants({ variant, size }), className)}
			{...rest}
		>
			{children}
		</kbd>
	);
};

export type TKbdProps = React.ComponentPropsWithoutRef<'kbd'> & VariantProps<typeof kbdVariants>;

const kbdVariants = cva(
	'inline-flex shrink-0 items-center justify-center font-sans font-medium whitespace-nowrap select-none',
	{
		variants: {
			variant: {
				default:
					'bg-base-100 text-base-600 in-data-[slot=tooltip-popup]:bg-base-50/20 in-data-[slot=tooltip-popup]:text-base-50',
				ghost: 'text-base-400'
			},
			size: {
				sm: 'h-3.5 min-w-3.5 rounded-full px-1.5 text-xs',
				md: 'h-4 min-w-4 rounded-full px-1.5 text-xs'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'sm'
		}
	}
);
