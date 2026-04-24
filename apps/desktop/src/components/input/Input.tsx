import { Input as InputPrimitive } from '@base-ui/react/input';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';

export const Input: React.FC<TInputProps> = (props) => {
	const { className, size = 'default', ...rest } = props;

	return (
		<InputPrimitive
			data-slot="input"
			data-size={size}
			className={cn(inputVariants({ size }), className)}
			{...rest}
		/>
	);
};

const inputVariants = cva(
	'border-base-200 bg-base-0 text-base-950 w-full min-w-0 rounded-lg border bg-clip-padding placeholder:text-base-400 transition focus-ring disabled:pointer-events-none disabled:opacity-50 invalid-ring file:inline-flex file:border-0 file:bg-transparent file:font-medium',
	{
		variants: {
			size: {
				default: 'h-8 px-2.5 py-1 text-sm file:h-6 file:text-sm',
				sm: 'h-7 px-2 py-0.5 text-xs file:h-5 file:text-xs'
			}
		},
		defaultVariants: {
			size: 'default'
		}
	}
);

type TInputProps = Omit<InputPrimitive.Props, 'size'> & VariantProps<typeof inputVariants>;
