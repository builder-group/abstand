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
		interactive = render != null,
		children,
		contentClassName,
		className,
		...rest
	} = props;

	return (
		<SettingsRowFrame
			size={size}
			interactive={interactive}
			render={render}
			renderStateSlot="settings-row"
			className={className}
			{...rest}
		>
			<div className="flex min-w-0 flex-col">
				<span className={labelVariants({ size })}>{label}</span>
				{description != null && (
					<span className={descriptionVariants({ size })}>{description}</span>
				)}
			</div>
			{children != null && (
				<div className={cn(controlVariants({ size }), contentClassName)}>{children}</div>
			)}
		</SettingsRowFrame>
	);
};

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
			default: 'text-[11px]',
			md: 'text-xs'
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

interface TSettingsRowProps extends TSettingsRowFrameProps {
	label: string;
	description?: string;
	contentClassName?: string;
}

export const SettingsRowFrame: React.FC<TSettingsRowFrameProps> = (props) => {
	const {
		size = 'default',
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
				className: cn(settingsRowFrameVariants({ size, interactive }), className),
				children
			},
			rest
		),
		render,
		state: { slot: renderStateSlot, size }
	});
};

const settingsRowFrameVariants = cva('flex w-full items-center justify-between text-left', {
	variants: {
		size: {
			default: 'min-h-9 gap-4 px-2.5 py-2',
			md: 'min-h-11 gap-5 px-3 py-2.5'
		},
		interactive: {
			true: 'hover:bg-base-950/6 active:bg-base-950/10 cursor-default',
			false: ''
		}
	},
	defaultVariants: {
		size: 'default',
		interactive: false
	}
});

type TSettingsRowFrameProps = useRender.ComponentProps<'div'> &
	VariantProps<typeof settingsRowFrameVariants> & {
		interactive?: boolean;
		renderStateSlot?: 'settings-row' | 'settings-row-frame';
	};
