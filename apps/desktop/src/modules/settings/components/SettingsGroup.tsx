import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';

export const SettingsGroup: React.FC<TSettingsGroupProps> = (props) => {
	const { title, size = 'default', children, className } = props;

	return (
		<>
			{title != null && <p className={titleVariants({ size })}>{title}</p>}
			<div className={cn(groupVariants({ size }), className)}>{children}</div>
		</>
	);
};

const groupVariants = cva(
	"bg-base-50/70 overflow-hidden *:relative [&>*+*]:before:absolute [&>*+*]:before:top-0 [&>*+*]:before:h-px [&>*+*]:before:bg-base-100 [&>*+*]:before:content-['']",
	{
		variants: {
			size: {
				default: 'rounded-xl [&>*+*]:before:inset-x-4',
				sm: 'rounded-lg [&>*+*]:before:inset-x-3'
			}
		},
		defaultVariants: { size: 'default' }
	}
);

const titleVariants = cva('text-base-600 ml-1 px-1 font-semibold', {
	variants: {
		size: {
			default: 'mb-2 text-[13px]',
			sm: 'mb-1.5 text-xs'
		}
	},
	defaultVariants: { size: 'default' }
});

type TSettingsGroupProps = {
	title?: string;
	children?: React.ReactNode;
	className?: string;
} & VariantProps<typeof groupVariants>;
