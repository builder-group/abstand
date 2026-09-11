import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';
import { ChevronsUpDownIcon } from '../display';

export const Select: React.FC<TSelectProps> = (props) => {
	const {
		variant = 'default',
		size = 'sm',
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

	const ghostWidthOffsetPx = React.useMemo(() => {
		switch (size) {
			case 'sm':
			default:
				return 10 + 34; // pl-2.5 + pr-8.5
			case 'md':
				return 12 + 44; // pl-3 + pr-11
		}
	}, [size]);

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
		// eslint-disable-next-line @eslint-react/set-state-in-effect -- ghost width is measured from committed DOM before paint
		setGhostWidth(
			Math.ceil(sizerRef.current.getBoundingClientRect().width) + ghostWidthOffsetPx + 1
		);
	}, [variant, ghostWidthOffsetPx]);

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
				<span ref={sizerRef} aria-hidden className={ghostSizerVariants({ size })} />
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
				<ChevronsUpDownIcon aria-hidden />
			</div>
		</div>
	);
};

export type TSelectProps = Omit<React.ComponentPropsWithoutRef<'select'>, 'size'> &
	VariantProps<typeof selectVariants>;

const selectVariants = cva(
	'cursor-default appearance-none rounded-lg border border-transparent transition-colors outline-none select-none disabled:pointer-events-none',
	{
		variants: {
			variant: {
				default: 'bg-base-100 text-base-950 hover:bg-base-200 invalid-ring focus-ring w-full',
				ghost: 'text-base-950 hover:bg-base-100 hover:text-base-950 bg-transparent'
			},
			size: {
				sm: 'h-7 pl-2.5 text-sm',
				md: 'h-8 pl-3 text-sm'
			}
		},
		compoundVariants: [
			{ variant: 'default', size: 'sm', className: 'pr-7' },
			{ variant: 'default', size: 'md', className: 'pr-9' },
			{ variant: 'ghost', size: 'sm', className: 'pr-8.5' },
			{ variant: 'ghost', size: 'md', className: 'pr-11' }
		],
		defaultVariants: {
			variant: 'default',
			size: 'sm'
		}
	}
);

const ghostSizerVariants = cva('pointer-events-none invisible absolute whitespace-pre', {
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

const chevronWrapperVariants = cva(
	'pointer-events-none absolute top-1/2 right-1 flex -translate-y-1/2 items-center justify-center transition-colors [&_svg]:select-none',
	{
		variants: {
			variant: {
				default: '[&_svg]:text-base-500',
				ghost:
					'peer-focus-ring bg-base-100 peer-invalid-ring [&_svg]:text-base-950 rounded-full border border-transparent group-has-[select:hover]/select:bg-transparent'
			},
			size: {
				sm: 'size-5.5 [&_svg]:size-3.5',
				md: 'size-6 [&_svg]:size-4'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'sm'
		}
	}
);
