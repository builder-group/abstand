import { Slider as SliderPrimitive } from '@base-ui/react/slider';
import React from 'react';
import { cn } from '@/lib';

export const Slider: React.FC<TSliderProps> = (props) => {
	const {
		value,
		defaultValue,
		min = 0,
		max = 100,
		step,
		showTicks = false,
		className,
		...rest
	} = props;
	const values = Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min];
	const ticks = React.useMemo(
		() =>
			showTicks && step
				? Array.from(
						{ length: Math.round((max - min) / step) + 1 },
						(_, i) => ((i * step) / (max - min)) * 100
					)
				: [],
		[showTicks, step, min, max]
	);

	return (
		<SliderPrimitive.Root
			data-slot="slider"
			defaultValue={defaultValue}
			value={value}
			min={min}
			max={max}
			step={step}
			thumbAlignment="edge"
			className={cn(
				'data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full',
				className
			)}
			{...rest}
		>
			<SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-40 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col">
				<SliderPrimitive.Track
					data-slot="slider-track"
					className="bg-base-200 relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-1 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1"
				>
					<SliderPrimitive.Indicator
						data-slot="slider-indicator"
						className="bg-primary absolute rounded-full data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
					/>
				</SliderPrimitive.Track>
				{ticks.length > 0 &&
					ticks.map((pct) => (
						<div
							key={pct}
							className="bg-base-300 pointer-events-none absolute top-2 size-0.5 -translate-x-1/2 rounded-full"
							// Offset by half thumb width (w-5 = 1.25rem) so ticks align with thumb snap centers
							style={{ left: `calc(${pct / 100} * (100% - 1.25rem) + 0.625rem)` }}
						/>
					))}
				{values.map((_, index) => (
					<SliderPrimitive.Thumb
						data-slot="slider-thumb"
						key={index}
						className={cn(
							'relative block shrink-0 rounded-full bg-white transition-[box-shadow,opacity] select-none',
							'data-[orientation=horizontal]:h-4 data-[orientation=horizontal]:w-5',
							'data-[orientation=vertical]:h-6 data-[orientation=vertical]:w-5',
							'border border-transparent after:absolute after:-inset-2',
							'shadow-[0_1px_3px_rgba(0,0,0,0.15),0_1px_2px_rgba(0,0,0,0.08)]',
							'focus-ring',
							'data-disabled:pointer-events-none'
						)}
					/>
				))}
			</SliderPrimitive.Control>
		</SliderPrimitive.Root>
	);
};

export type TSliderProps = SliderPrimitive.Root.Props & { showTicks?: boolean };
