import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';

export const Alert: React.FC<TAlertProps> = (props) => {
	const { variant = 'default', className, ...rest } = props;

	return (
		<div
			role="alert"
			data-slot="alert"
			data-variant={variant}
			className={cn(alertVariants({ variant }), className)}
			{...rest}
		/>
	);
};

export type TAlertProps = React.ComponentProps<'div'> & VariantProps<typeof alertVariants>;

const alertVariants = cva(
	"text-base-950 relative grid w-full grid-cols-[0_1fr] items-start rounded-xl border px-3 py-2.5 text-sm has-[>svg]:grid-cols-[1rem_1fr] has-[>svg]:gap-x-2.5 [&>svg]:shrink-0 [&>svg]:translate-y-0.5 [&>svg:not([class*='size-'])]:size-4",
	{
		variants: {
			variant: {
				default: 'border-base-100 bg-base-0/80 [&>svg]:text-base-500',
				info: 'border-secondary/20 bg-secondary/10 [&>svg]:text-secondary',
				success: 'border-success/20 bg-success/10 [&>svg]:text-success',
				warning: 'border-warning/25 bg-warning/10 [&>svg]:text-warning',
				destructive: 'border-error/25 bg-error/10 [&>svg]:text-error'
			}
		},
		defaultVariants: {
			variant: 'default'
		}
	}
);

export const AlertTitle: React.FC<TAlertTitleProps> = (props) => {
	const { className, ...rest } = props;

	return (
		<div
			data-slot="alert-title"
			className={cn('col-start-2 text-sm font-medium tracking-normal', className)}
			{...rest}
		/>
	);
};

export type TAlertTitleProps = React.ComponentProps<'div'>;

export const AlertDescription: React.FC<TAlertDescriptionProps> = (props) => {
	const { className, ...rest } = props;

	return (
		<div
			data-slot="alert-description"
			className={cn(
				'text-base-500 col-start-2 grid justify-items-start gap-1 text-sm leading-5',
				className
			)}
			{...rest}
		/>
	);
};

export type TAlertDescriptionProps = React.ComponentProps<'div'>;
