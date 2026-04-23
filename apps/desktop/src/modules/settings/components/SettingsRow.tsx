import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';

export const SettingsRow: React.FC<TSettingsRowProps> = (props) => {
	const { label, description, size = 'default', className, render, children, ...rest } = props;

	return useRender({
		defaultTagName: 'div',
		props: mergeProps<'div'>(
			{
				className: cn(settingsRowVariants({ size }), className),
				children: (
					<>
						<div className="flex min-w-0 flex-col gap-0.5">
							<span className={labelVariants({ size })}>{label}</span>
							{description != null && (
								<span className={descriptionVariants({ size })}>{description}</span>
							)}
						</div>
						{children != null && <div className={controlVariants({ size })}>{children}</div>}
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
	'flex items-center justify-between [button]:w-full [button]:cursor-default [button]:text-left [button]:hover:bg-base-100 [button]:active:bg-base-200',
	{
		variants: {
			size: {
				default: 'min-h-10 gap-6 px-4 py-2.5',
				sm: 'min-h-8 gap-4 px-3 py-2'
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
			default: 'text-sm',
			sm: 'text-[13px]'
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
			sm: 'text-[11px]'
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
			sm: 'gap-1.5'
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
	};
