import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import React from 'react';
import { cn } from '@/lib';

export const InlineCode: React.FC<TInlineCodeProps> = (props) => {
	const { render, children, className, ...rest } = props;

	return useRender({
		defaultTagName: 'code',
		props: mergeProps<'code'>(
			{
				className: cn(
					'bg-base-950/6 text-base-700 rounded box-decoration-clone px-1 py-px font-mono text-[0.92em]',
					className
				),
				children
			},
			rest
		),
		render,
		state: { slot: 'inline-code' }
	});
};

export type TInlineCodeProps = useRender.ComponentProps<'code'>;
