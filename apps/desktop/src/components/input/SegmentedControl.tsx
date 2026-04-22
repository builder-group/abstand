import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';

const SegmentedControlContext = React.createContext<TSegmentedControlContext>({
	registerItem: () => {},
	size: 'default'
});

interface TSegmentedControlContext {
	registerItem: (value: string, node: HTMLButtonElement | null) => void;
	size: TSegmentedControlSize;
}

type TSegmentedControlSize = 'default' | 'sm';

export const SegmentedControl: React.FC<TSegmentedControlProps> = (props) => {
	const { value, onValueChange, className, size = 'default', children } = props;
	const groupRef = React.useRef<HTMLDivElement | null>(null);
	const itemElementsRef = React.useRef(new Map<string, HTMLButtonElement>());
	const [pill, setPill] = React.useState<TPillRect | null>(null);

	// MARK: - Actions

	const registerItem = React.useCallback((itemValue: string, node: HTMLButtonElement | null) => {
		if (node == null) {
			itemElementsRef.current.delete(itemValue);
			return;
		}

		itemElementsRef.current.set(itemValue, node);
	}, []);

	const updatePill = React.useCallback(() => {
		const group = groupRef.current;
		if (group == null || value == null) {
			setPill(null);
			return;
		}

		const active = itemElementsRef.current.get(value);
		if (active == null) {
			setPill(null);
			return;
		}

		setPill({
			left: active.offsetLeft,
			top: active.offsetTop,
			width: active.offsetWidth,
			height: active.offsetHeight
		});
	}, [value]);

	// MARK: - Effects

	React.useLayoutEffect(() => {
		updatePill();

		const group = groupRef.current;
		if (group == null) {
			return;
		}

		const ro = new ResizeObserver(updatePill);
		ro.observe(group);
		itemElementsRef.current.forEach((item) => {
			ro.observe(item);
		});

		return () => {
			ro.disconnect();
		};
	}, [children, size, updatePill, value]);

	// MARK: - UI

	return (
		<SegmentedControlContext.Provider
			value={{
				registerItem,
				size
			}}
		>
			<ToggleGroupPrimitive
				ref={groupRef}
				data-size={size}
				data-slot="segmented-control"
				value={value != null ? [value] : []}
				onValueChange={(nextValue, eventDetails) => {
					const selected = nextValue[nextValue.length - 1];
					if (selected == null) {
						eventDetails.cancel();
						return;
					}

					onValueChange(selected);
				}}
				className={cn(segmentedControlVariants({ size }), className)}
			>
				{pill != null && (
					<div
						aria-hidden
						className="pointer-events-none absolute rounded-md bg-white shadow-sm transition-[left,top,width,height] duration-200 ease-in-out"
						style={{ left: pill.left, top: pill.top, width: pill.width, height: pill.height }}
					/>
				)}
				{children}
			</ToggleGroupPrimitive>
		</SegmentedControlContext.Provider>
	);
};

const segmentedControlVariants = cva(
	'relative inline-flex items-center gap-0.5 rounded-lg bg-base-100',
	{
		variants: {
			size: {
				default: 'p-0.5',
				sm: 'p-0.5'
			}
		},
		defaultVariants: {
			size: 'default'
		}
	}
);

interface TSegmentedControlProps extends VariantProps<typeof segmentedControlVariants> {
	value: string | undefined;
	onValueChange: (value: string) => void;
	className?: string;
	children: React.ReactNode;
	size?: TSegmentedControlSize;
}

interface TPillRect {
	left: number;
	top: number;
	width: number;
	height: number;
}

export const SegmentedControlItem: React.FC<TSegmentedControlItemProps> = (props) => {
	const { className, value, ...rest } = props;
	const { registerItem, size } = React.useContext(SegmentedControlContext);

	const ref = React.useCallback(
		(node: HTMLButtonElement | null) => {
			registerItem(value, node);
		},
		[registerItem, value]
	);

	return (
		<Toggle
			data-slot="segmented-control-item"
			ref={ref}
			className={cn(segmentedControlItemVariants({ size }), className)}
			value={value}
			{...rest}
		/>
	);
};

const segmentedControlItemVariants = cva(
	"relative inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors select-none text-base-500 hover:text-base-950 data-pressed:text-apple-gray-dark-6 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 focus-ring",
	{
		variants: {
			size: {
				default: 'h-7 px-2.5 text-sm',
				sm: "h-6 px-2 text-xs [&_svg:not([class*='size-'])]:size-3.5"
			}
		},
		defaultVariants: {
			size: 'default'
		}
	}
);

type TSegmentedControlItemProps = Omit<React.ComponentProps<typeof Toggle>, 'className' | 'value'> &
	VariantProps<typeof segmentedControlItemVariants> & {
		className?: string;
		value: string;
	};
