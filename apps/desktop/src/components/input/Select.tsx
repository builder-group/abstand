import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';
import { ChevronsUpDownIcon } from '../display';

export const Select: React.FC<TSelectProps> = (props) => {
	const {
		variant = 'default',
		size = 'default',
		children,
		className,
		value,
		defaultValue,
		onChange,
		style,
		...rest
	} = props;

	const sizerRef = React.useRef<HTMLSpanElement>(null);
	const selectRef = React.useRef<HTMLSelectElement>(null);
	const [ghostWidth, setGhostWidth] = React.useState<number | undefined>(undefined);

	// Matches pl-3+pr-9 (default) and pl-2.5+pr-7 (sm) in selectVariants
	const paddingPx = size === 'sm' ? 38 : 48;

	const measureWidth = React.useCallback(() => {
		if (variant !== 'ghost' || sizerRef.current == null || selectRef.current == null) {
			return;
		}

		const selectedOption = selectRef.current.options[selectRef.current.selectedIndex];
		if (selectedOption == null) {
			return;
		}

		sizerRef.current.textContent = selectedOption.text;
		// +1 compensates for native <select> rendering text slightly wider than a <span>
		setGhostWidth(Math.ceil(sizerRef.current.getBoundingClientRect().width) + paddingPx + 1);
	}, [variant, paddingPx]);

	React.useLayoutEffect(() => {
		measureWidth();
	}, [children, measureWidth, value]);

	return (
		<div
			data-slot="select-wrapper"
			data-variant={variant}
			data-size={size}
			className="group/select relative w-fit has-[select:disabled]:opacity-50"
		>
			{variant === 'ghost' && (
				<span
					ref={sizerRef}
					aria-hidden
					className={cn(
						'pointer-events-none invisible absolute whitespace-pre',
						size === 'sm' ? 'text-[13px]' : 'text-sm'
					)}
				/>
			)}
			<select
				ref={selectRef}
				data-slot="select"
				data-variant={variant}
				data-size={size}
				className={cn('peer', selectVariants({ size, variant }), className)}
				style={variant === 'ghost' && ghostWidth != null ? { ...style, width: ghostWidth } : style}
				value={value}
				defaultValue={defaultValue}
				onChange={(e) => {
					measureWidth();
					onChange?.(e);
				}}
				{...rest}
			>
				{children}
			</select>
			<div
				data-slot="select-chevron"
				data-variant={variant}
				data-size={size}
				className={chevronWrapperVariants({ size, variant })}
			>
				<ChevronsUpDownIcon
					aria-hidden
					className={cn(
						'select-none',
						variant === 'ghost' ? 'text-base-950' : 'text-base-500',
						size === 'sm' ? 'size-3' : 'size-3.5'
					)}
				/>
			</div>
		</div>
	);
};

const selectVariants = cva(
	'appearance-none cursor-default select-none rounded-lg border border-transparent outline-none transition-colors disabled:pointer-events-none',
	{
		variants: {
			variant: {
				default: 'w-full bg-base-100 text-base-950 hover:bg-base-200 invalid-ring focus-ring',
				ghost: 'bg-transparent text-base-950 hover:bg-base-100 hover:text-base-950'
			},
			size: {
				default: 'h-8 pl-3 pr-9 text-sm',
				sm: 'h-7 pl-2.5 pr-7 text-[13px]'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	}
);

const chevronWrapperVariants = cva(
	'pointer-events-none absolute top-1/2 flex -translate-y-1/2 items-center justify-center transition-colors',
	{
		variants: {
			variant: {
				default: '',
				ghost:
					'peer-focus-ring rounded-full border border-transparent bg-base-100 group-has-[select:hover]/select:bg-transparent peer-invalid-ring'
			},
			size: {
				default: 'size-6',
				sm: 'size-5'
			}
		},
		compoundVariants: [
			{ variant: 'default', size: 'default', className: 'right-2' },
			{ variant: 'default', size: 'sm', className: 'right-1.5' },
			{ variant: 'ghost', size: 'default', className: 'right-1' },
			{ variant: 'ghost', size: 'sm', className: 'right-0.5' }
		],
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	}
);

export type TSelectProps = Omit<React.ComponentPropsWithoutRef<'select'>, 'size'> &
	VariantProps<typeof selectVariants>;
