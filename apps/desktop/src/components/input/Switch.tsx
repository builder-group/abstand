import { Switch as SwitchPrimitive } from '@base-ui/react/switch';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';

export const Switch: React.FC<TSwitchProps> = (props) => {
	const { size = 'sm', className, ...rest } = props;

	return (
		<SwitchPrimitive.Root
			data-slot="switch"
			data-size={size}
			className={cn(switchVariants({ size }), className)}
			{...rest}
		>
			<SwitchPrimitive.Thumb
				data-slot="switch-thumb"
				data-size={size}
				className={thumbVariants({ size })}
			/>
		</SwitchPrimitive.Root>
	);
};

const switchVariants = cva(
	'data-unchecked:bg-base-200 data-checked:bg-primary focus-ring inline-flex shrink-0 cursor-default items-center border border-transparent transition-colors select-none data-disabled:pointer-events-none data-disabled:opacity-50',
	{
		variants: {
			size: {
				sm: 'h-4.5 w-9.5 rounded-full',
				md: 'h-5 w-11 rounded-full'
			}
		},
		defaultVariants: { size: 'sm' }
	}
);

const thumbVariants = cva('pointer-events-none block shrink-0 bg-white transition-transform', {
	variants: {
		size: {
			sm: 'h-4 w-6 rounded-full data-checked:translate-x-3 data-unchecked:translate-x-0',
			md: 'h-4.5 w-6.5 rounded-full data-checked:translate-x-4 data-unchecked:translate-x-0'
		}
	},
	defaultVariants: { size: 'sm' }
});

export type TSwitchProps = SwitchPrimitive.Root.Props & VariantProps<typeof switchVariants>;
