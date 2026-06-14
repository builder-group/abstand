import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group';
import { cva } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';
import { Toggle, type TToggleProps } from './Toggle';

const ToggleGroupContext = React.createContext<TToggleGroupContext>({
	variant: 'default',
	size: 'sm',
	spacing: 0,
	orientation: 'horizontal'
});

interface TToggleGroupContext {
	variant: TToggleGroupVariant;
	size: TToggleGroupSize;
	spacing: number;
	orientation: TToggleGroupOrientation;
}

type TToggleGroupVariant = NonNullable<TToggleProps['variant']>;
type TToggleGroupSize = NonNullable<TToggleProps['size']>;
type TToggleGroupOrientation = NonNullable<ToggleGroupPrimitive.Props['orientation']>;

export const ToggleGroup: React.FC<TToggleGroupProps> = (props) => {
	const {
		variant = 'default',
		size = 'sm',
		spacing = variant === 'outline' ? 0 : 1,
		orientation = 'horizontal',
		children,
		className,
		style,
		...rest
	} = props;

	return (
		<ToggleGroupPrimitive
			data-slot="toggle-group"
			data-variant={variant}
			data-size={size}
			data-spacing={spacing}
			orientation={orientation}
			style={getToggleGroupStyle(style, spacing)}
			className={cn(toggleGroupVariants({ orientation }), className)}
			{...rest}
		>
			<ToggleGroupContext value={{ variant, size, spacing, orientation }}>
				{children}
			</ToggleGroupContext>
		</ToggleGroupPrimitive>
	);
};

export interface TToggleGroupProps extends ToggleGroupPrimitive.Props {
	variant?: TToggleGroupVariant;
	size?: TToggleGroupSize;
	spacing?: number;
}

const toggleGroupVariants = cva('group/toggle-group inline-flex w-fit items-center rounded-lg', {
	variants: {
		orientation: {
			horizontal: 'flex-row',
			vertical: 'flex-col items-stretch'
		}
	},
	defaultVariants: {
		orientation: 'horizontal'
	}
});

function getToggleGroupStyle(
	style: TToggleGroupProps['style'],
	spacing: number
): TToggleGroupProps['style'] {
	const gap = `${spacing * 0.25}rem`;
	if (typeof style === 'function') {
		return (state) => ({ ...style(state), gap });
	}

	return { ...style, gap };
}

export const ToggleGroupItem: React.FC<TToggleGroupItemProps> = (props) => {
	const { className, ...rest } = props;
	const context = React.use(ToggleGroupContext);

	return (
		<Toggle
			data-slot="toggle-group-item"
			data-spacing={context.spacing}
			variant={context.variant}
			size={context.size}
			className={cn(toggleGroupItemVariants({ variant: context.variant }), className)}
			{...rest}
		/>
	);
};

export type TToggleGroupItemProps = Omit<
	TToggleProps,
	'defaultPressed' | 'onPressedChange' | 'pressed' | 'size' | 'value' | 'variant'
> & {
	value: string;
};

const toggleGroupItemVariants = cva('shrink-0', {
	variants: {
		variant: {
			default: '',
			ghost: '',
			outline:
				'data-[spacing=0]:rounded-none data-[spacing=0]:px-2 group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:border-l-0 group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:border-t-0 group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:first:rounded-l-lg group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:first:border-l group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:first:rounded-t-lg group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:first:border-t group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:last:rounded-r-lg group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:last:rounded-b-lg'
		}
	},
	defaultVariants: {
		variant: 'default'
	}
});
