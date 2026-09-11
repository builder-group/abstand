import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';
import { LoaderIcon } from './icons';

export const Spinner: React.FC<TSpinnerProps> = (props) => {
	const { size = 'sm', tone = 'muted', className, ...rest } = props;

	return (
		<LoaderIcon
			data-slot="spinner"
			data-size={size}
			data-tone={tone}
			role="status"
			aria-label="Loading"
			className={cn(spinnerVariants({ size, tone }), className)}
			{...rest}
		/>
	);
};

export type TSpinnerProps = React.ComponentPropsWithoutRef<'svg'> &
	VariantProps<typeof spinnerVariants>;

const spinnerVariants = cva('shrink-0 animate-spin', {
	variants: {
		size: {
			sm: 'size-3.5',
			md: 'size-4'
		},
		tone: {
			muted: 'text-base-400',
			current: 'text-current'
		}
	},
	defaultVariants: {
		size: 'sm',
		tone: 'muted'
	}
});
