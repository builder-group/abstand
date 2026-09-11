import { Input as InputPrimitive } from '@base-ui/react/input';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';

export const Input: React.FC<TInputProps> = (props) => {
	const { size = 'sm', className, ...rest } = props;

	return (
		<InputPrimitive
			data-slot="input"
			data-size={size}
			className={cn(inputVariants({ size }), className)}
			{...rest}
		/>
	);
};

export type TInputProps = Omit<InputPrimitive.Props, 'size'> & VariantProps<typeof inputVariants>;

const inputVariants = cva(
	'border-base-200 bg-base-0 text-base-950 placeholder:text-base-400 focus-ring invalid-ring w-full min-w-0 border bg-clip-padding transition file:inline-flex file:border-0 file:bg-transparent file:font-medium disabled:pointer-events-none disabled:opacity-50',
	{
		variants: {
			size: {
				sm: 'h-7 rounded-lg px-2 py-0.5 text-sm file:h-5 file:text-sm',
				md: 'h-8 rounded-lg px-2.5 py-1 text-sm file:h-6 file:text-sm'
			}
		},
		defaultVariants: {
			size: 'sm'
		}
	}
);
