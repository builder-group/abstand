import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';

export const SettingsRow: React.FC<TSettingsRowProps> = (props) => {
	const {
		label,
		labelAccessory,
		description,
		descriptionVariant = 'default',
		variant: rowVariant = 'default',
		size = 'sm',
		render,
		interactive = render != null,
		children,
		contentClassName,
		className,
		...rest
	} = props;

	return (
		<SettingsRowFrame
			variant={rowVariant}
			size={size}
			interactive={interactive}
			render={render}
			renderStateSlot="settings-row"
			className={className}
			{...rest}
		>
			<div className="flex min-w-0 flex-col">
				<div className="flex min-w-0 items-center gap-0.5">
					<span className={labelVariants({ size })}>{label}</span>
					{labelAccessory}
				</div>
				{description != null && (
					<span className={descriptionVariants({ size, variant: descriptionVariant })}>
						{description}
					</span>
				)}
			</div>
			{children != null && (
				<div className={cn(controlVariants({ size }), contentClassName)}>{children}</div>
			)}
		</SettingsRowFrame>
	);
};

interface TSettingsRowProps extends TSettingsRowFrameProps {
	label: string;
	labelAccessory?: React.ReactNode;
	description?: React.ReactNode;
	descriptionVariant?: VariantProps<typeof descriptionVariants>['variant'];
	contentClassName?: string;
}

const labelVariants = cva('text-base-950', {
	variants: {
		size: {
			sm: 'text-sm',
			md: 'text-sm'
		}
	},
	defaultVariants: {
		size: 'sm'
	}
});

const descriptionVariants = cva('', {
	variants: {
		variant: {
			default: 'text-base-500',
			warning: 'text-warning',
			error: 'text-error'
		},
		size: {
			sm: 'mt-px text-xs',
			md: 'mt-0.5 text-xs'
		}
	},
	defaultVariants: {
		variant: 'default',
		size: 'sm'
	}
});

const controlVariants = cva('flex shrink-0 items-center', {
	variants: {
		size: {
			sm: "gap-2 [&>svg:not([class*='size-'])]:size-3.5",
			md: "gap-2.5 [&>svg:not([class*='size-'])]:size-4"
		}
	},
	defaultVariants: {
		size: 'sm'
	}
});

export const SettingsRowFrame: React.FC<TSettingsRowFrameProps> = (props) => {
	const {
		variant = 'default',
		size = 'sm',
		render,
		renderStateSlot = 'settings-row-frame',
		interactive = render != null,
		children,
		className,
		...rest
	} = props;

	return useRender({
		defaultTagName: 'div',
		props: mergeProps<'div'>(
			{
				className: cn(settingsRowFrameVariants({ variant, interactive, size }), className),
				children
			},
			rest
		),
		render,
		state: { slot: renderStateSlot, variant, size }
	});
};

type TSettingsRowFrameProps = useRender.ComponentProps<'div'> &
	VariantProps<typeof settingsRowFrameVariants> & {
		interactive?: boolean;
		renderStateSlot?: 'settings-row' | 'settings-row-frame';
	};

const settingsRowFrameVariants = cva('flex w-full items-center justify-between text-left', {
	variants: {
		variant: {
			default: 'py-2.5',
			compact: 'py-1.5'
		},
		interactive: {
			true: 'hover:bg-base-950/6 active:bg-base-950/10 cursor-default',
			false: ''
		},
		size: {
			sm: 'min-h-9 gap-4 px-2.5',
			md: 'min-h-11 gap-5 px-3'
		}
	},
	defaultVariants: {
		size: 'sm',
		variant: 'default',
		interactive: false
	}
});
