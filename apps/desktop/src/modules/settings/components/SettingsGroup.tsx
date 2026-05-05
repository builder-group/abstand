import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';

export const SettingsGroup: React.FC<TSettingsGroupProps> = (props) => {
	const { title, size = 'default', children, contentClassName, className } = props;

	return (
		<div className={cn(settingsGroupVariants({ size }), className)}>
			{title != null && <p className={titleVariants({ size })}>{title}</p>}
			<div className={cn(contentVariants({ size }), contentClassName)}>{children}</div>
		</div>
	);
};

const settingsGroupVariants = cva('flex w-full flex-col', {
	variants: {
		size: {
			default: 'gap-2',
			md: 'gap-2.5'
		}
	},
	defaultVariants: { size: 'default' }
});

const contentVariants = cva(
	"bg-base-50/70 [&>*+*]:before:bg-base-100 overflow-hidden *:relative [&>*+*]:before:absolute [&>*+*]:before:top-0 [&>*+*]:before:h-px [&>*+*]:before:content-['']",
	{
		variants: {
			size: {
				default: 'rounded-xl [&>*+*]:before:inset-x-2.5',
				md: 'rounded-xl [&>*+*]:before:inset-x-3'
			}
		},
		defaultVariants: { size: 'default' }
	}
);

const titleVariants = cva('text-base-600 ml-2.5 font-semibold', {
	variants: {
		size: {
			default: 'text-[13px]',
			md: 'text-sm'
		}
	},
	defaultVariants: { size: 'default' }
});

type TSettingsGroupProps = {
	title?: string;
	children?: React.ReactNode;
	contentClassName?: string;
	className?: string;
} & VariantProps<typeof settingsGroupVariants>;
