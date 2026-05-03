import { Switch as SwitchPrimitive } from '@base-ui/react/switch';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';

export const Switch: React.FC<TSwitchProps> = (props) => {
	const { size = 'default', className, ...rest } = props;

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
	'group/switch inline-flex shrink-0 cursor-default items-center rounded-full border border-transparent select-none transition-colors data-unchecked:bg-base-200 data-checked:bg-primary focus-ring data-disabled:pointer-events-none data-disabled:opacity-50',
	{
		variants: {
			size: {
				default: 'h-5 w-11',
				sm: 'h-4 w-9'
			}
		},
		defaultVariants: { size: 'default' }
	}
);

const thumbVariants = cva(
	[
		'pointer-events-none block shrink-0 rounded-full bg-white transition-transform',
		'shadow-[0_1px_3px_rgba(0,0,0,0.15),0_1px_2px_rgba(0,0,0,0.08)]'
	],
	{
		variants: {
			size: {
				default: 'h-4.5 w-6.5 data-unchecked:translate-x-0 data-checked:translate-x-4',
				sm: 'h-3.5 w-5.5 data-unchecked:translate-x-0 data-checked:translate-x-3'
			}
		},
		defaultVariants: { size: 'default' }
	}
);

export type TSwitchProps = SwitchPrimitive.Root.Props & VariantProps<typeof switchVariants>;
