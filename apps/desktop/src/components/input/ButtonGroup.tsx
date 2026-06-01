import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';

export const ButtonGroup: React.FC<TButtonGroupProps> = (props) => {
	const { orientation = 'horizontal', className, ...rest } = props;

	return (
		<div
			role="group"
			data-slot="button-group"
			data-orientation={orientation}
			className={cn(buttonGroupVariants({ orientation }), className)}
			{...rest}
		/>
	);
};

export interface TButtonGroupProps extends React.ComponentProps<'div'> {
	orientation?: TButtonGroupOrientation;
}

type TButtonGroupOrientation = NonNullable<VariantProps<typeof buttonGroupVariants>['orientation']>;

const buttonGroupVariants = cva(
	'inline-flex w-fit items-stretch *:data-[slot=input]:flex-1 [&>:is([data-slot=button],[data-slot=button-group-text],[data-slot=input],[data-slot=toggle])]:rounded-lg [&>[data-slot=select-wrapper]:has([data-slot=select]:focus-visible)]:relative [&>[data-slot=select-wrapper]:has([data-slot=select]:focus-visible)]:z-10 [&>[data-slot=select-wrapper]>[data-slot=select]]:rounded-lg [&>[data-slot]:focus-visible]:relative [&>[data-slot]:focus-visible]:z-10',
	{
		variants: {
			orientation: {
				horizontal:
					'[&>:is([data-slot=button],[data-slot=button-group-text],[data-slot=input],[data-slot=toggle]):not(:first-child)]:rounded-l-none [&>:is([data-slot=button],[data-slot=button-group-text],[data-slot=input],[data-slot=toggle]):not(:first-child)]:border-l-0 [&>:is([data-slot=button],[data-slot=button-group-text],[data-slot=input],[data-slot=toggle]):not(:last-child)]:rounded-r-none [&>[data-slot=select-wrapper]:not(:first-child)>[data-slot=select]]:rounded-l-none [&>[data-slot=select-wrapper]:not(:first-child)>[data-slot=select]]:border-l-0 [&>[data-slot=select-wrapper]:not(:last-child)>[data-slot=select]]:rounded-r-none',
				vertical:
					'flex-col [&>:is([data-slot=button],[data-slot=button-group-text],[data-slot=input],[data-slot=toggle]):not(:first-child)]:rounded-t-none [&>:is([data-slot=button],[data-slot=button-group-text],[data-slot=input],[data-slot=toggle]):not(:first-child)]:border-t-0 [&>:is([data-slot=button],[data-slot=button-group-text],[data-slot=input],[data-slot=toggle]):not(:last-child)]:rounded-b-none [&>[data-slot=select-wrapper]:not(:first-child)>[data-slot=select]]:rounded-t-none [&>[data-slot=select-wrapper]:not(:first-child)>[data-slot=select]]:border-t-0 [&>[data-slot=select-wrapper]:not(:last-child)>[data-slot=select]]:rounded-b-none'
			}
		},
		defaultVariants: {
			orientation: 'horizontal'
		}
	}
);

export const ButtonGroupText: React.FC<TButtonGroupTextProps> = (props) => {
	const { className, render, ...rest } = props;

	return useRender({
		defaultTagName: 'span',
		props: mergeProps<'span'>(
			{
				className: cn(
					"border-base-200 bg-base-100 text-base-600 flex min-h-7 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-2.5 py-0.5 text-sm font-medium select-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
					className
				)
			},
			rest
		),
		render,
		state: { slot: 'button-group-text' }
	});
};

export type TButtonGroupTextProps = useRender.ComponentProps<'span'>;

export const ButtonGroupSeparator: React.FC<TButtonGroupSeparatorProps> = (props) => {
	const { orientation = 'vertical', className, ...rest } = props;

	return (
		<div
			aria-hidden
			data-slot="button-group-separator"
			data-orientation={orientation}
			className={cn(buttonGroupSeparatorVariants({ orientation }), className)}
			{...rest}
		/>
	);
};

export interface TButtonGroupSeparatorProps extends React.ComponentProps<'div'> {
	orientation?: TButtonGroupSeparatorOrientation;
}

type TButtonGroupSeparatorOrientation = NonNullable<
	VariantProps<typeof buttonGroupSeparatorVariants>['orientation']
>;

const buttonGroupSeparatorVariants = cva('bg-base-200 shrink-0', {
	variants: {
		orientation: {
			horizontal: 'my-px h-px self-stretch',
			vertical: 'mx-px w-px self-stretch'
		}
	},
	defaultVariants: {
		orientation: 'vertical'
	}
});
