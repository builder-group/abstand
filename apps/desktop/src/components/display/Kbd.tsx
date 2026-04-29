import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';

export const Kbd: React.FC<TKbdProps> = (props) => {
	const { className, variant = 'default', size = 'default', children, ...rest } = props;

	return (
		<kbd data-slot="kbd" className={cn(kbdVariants({ variant, size }), className)} {...rest}>
			{children}
		</kbd>
	);
};

const kbdVariants = cva(
	'inline-flex shrink-0 items-center justify-center rounded-full font-sans font-medium whitespace-nowrap select-none',
	{
		variants: {
			variant: {
				default: [
					'bg-base-100 text-base-600',
					'in-data-[slot=tooltip-popup]:bg-base-50/20 in-data-[slot=tooltip-popup]:text-base-50'
				],
				ghost: 'text-base-400'
			},
			size: {
				default: 'h-4 min-w-4 px-1.5 text-[11px]',
				md: 'h-5 min-w-5 px-1.5 text-xs'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	}
);

export type TKbdProps = React.ComponentPropsWithoutRef<'kbd'> & VariantProps<typeof kbdVariants>;
