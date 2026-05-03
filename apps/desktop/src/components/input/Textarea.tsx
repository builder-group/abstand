import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';

export const Textarea: React.FC<TTextareaProps> = (props) => {
	const { size = 'default', className, ...rest } = props;

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
	'border-base-200 bg-base-0 text-base-950 flex min-h-16 w-full min-w-0 rounded-lg border bg-clip-padding px-2.5 py-2 placeholder:text-base-400 transition resize-y focus-ring disabled:pointer-events-none disabled:opacity-50 invalid-ring',
	{
		variants: {
			size: {
				default: 'text-sm',
				sm: 'min-h-14 px-2 py-1.5 text-xs'
			}
		},
		defaultVariants: {
			size: 'default'
		}
	}
);

export type TTextareaProps = React.ComponentProps<'textarea'> &
	VariantProps<typeof textareaVariants>;
