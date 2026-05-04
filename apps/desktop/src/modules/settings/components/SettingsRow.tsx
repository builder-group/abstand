import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';

export const SettingsRow: React.FC<TSettingsRowProps> = (props) => {
	const {
		label,
		description,
		size = 'default',
		render,
		children,
		contentClassName,
		className,
		...rest
	} = props;

	return useRender({
		defaultTagName: 'div',
		props: mergeProps<'div'>(
			{
				className: cn(settingsRowVariants({ size }), className),
				children: (
					<>
						<div className="flex min-w-0 flex-col">
							<span className={labelVariants({ size })}>{label}</span>
							{description != null && (
								<span className={descriptionVariants({ size })}>{description}</span>
							)}
						</div>
						{children != null && (
							<div className={cn(controlVariants({ size }), contentClassName)}>{children}</div>
						)}
					</>
				)
			},
			rest
		),
		render,
		state: { slot: 'settings-row', size }
	});
};

const settingsRowVariants = cva(
	'[button]:hover:bg-base-950/6 [button]:active:bg-base-950/10 [a]:hover:bg-base-950/6 [a]:active:bg-base-950/10 flex items-center justify-between [a]:w-full [a]:cursor-default [a]:text-left [button]:w-full [button]:cursor-default [button]:text-left',
	{
		variants: {
			size: {
				default: 'min-h-8 gap-4 px-2.5 py-2.25',
				md: 'min-h-10 gap-5 px-3 py-2.5'
			}
		},
		defaultVariants: {
			size: 'default'
		}
	}
);

const labelVariants = cva('text-base-950', {
	variants: {
		size: {
			default: 'text-[13px]',
			md: 'text-sm'
		}
	},
	defaultVariants: {
		size: 'default'
	}
});

const descriptionVariants = cva('text-base-500', {
	variants: {
		size: {
			default: 'text-xs',
			md: 'text-[13px]'
		}
	},
	defaultVariants: {
		size: 'default'
	}
});

const controlVariants = cva('flex shrink-0 items-center', {
	variants: {
		size: {
			default: 'gap-2',
			md: 'gap-2.5'
		}
	},
	defaultVariants: {
		size: 'default'
	}
});

type TSettingsRowProps = useRender.ComponentProps<'div'> &
	VariantProps<typeof settingsRowVariants> & {
		label: string;
		description?: string;
		contentClassName?: string;
	};
