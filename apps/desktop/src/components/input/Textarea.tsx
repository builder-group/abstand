import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';

export const Textarea: React.FC<TTextareaProps> = (props) => {
	const { size = 'sm', className, ...rest } = props;

	return (
		<textarea
			data-slot="textarea"
			data-size={size}
			className={cn(textareaVariants({ size }), className)}
			{...rest}
		/>
	);
};

const textareaVariants = cva(
	'border-base-200 bg-base-0 text-base-950 placeholder:text-base-400 focus-ring invalid-ring flex w-full min-w-0 resize-y border bg-clip-padding transition disabled:pointer-events-none disabled:opacity-50',
	{
		variants: {
			size: {
				sm: 'min-h-14 rounded-lg px-2 py-1.5 text-sm',
				md: 'min-h-16 rounded-lg px-2.5 py-2 text-sm'
			}
		},
		defaultVariants: {
			size: 'sm'
		}
	}
);

export type TTextareaProps = React.ComponentProps<'textarea'> &
	VariantProps<typeof textareaVariants>;
