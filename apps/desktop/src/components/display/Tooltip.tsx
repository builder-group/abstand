import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';
import { Kbd } from './Kbd';

export const Tooltip: React.FC<TTooltipProps> = (props) => {
	const {
		content,
		shortcut,
		size = 'default',
		side = 'bottom',
		delay = 400,
		disableHoverablePopup = true,
		children,
		className,
		...rest
	} = props;

	return (
		<TooltipPrimitive.Root disableHoverablePopup={disableHoverablePopup} {...rest}>
			<TooltipPrimitive.Trigger render={children} delay={delay} />
			<TooltipPrimitive.Portal>
				<TooltipPrimitive.Positioner side={side} sideOffset={6} className="z-50">
					<TooltipPrimitive.Popup
						data-slot="tooltip-popup"
						data-size={size}
						className={cn(tooltipVariants({ size }), className)}
					>
						{content}
						{shortcut != null && <Kbd>{shortcut}</Kbd>}
					</TooltipPrimitive.Popup>
				</TooltipPrimitive.Positioner>
			</TooltipPrimitive.Portal>
		</TooltipPrimitive.Root>
	);
};

const tooltipVariants = cva(
	'bg-base-950/90 text-base-50 border-base-50/10 inline-flex origin-(--transform-origin) items-center border font-medium shadow-md transition-[opacity,scale] duration-150 ease-out data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0',
	{
		variants: {
			size: {
				default: 'gap-1.5 rounded-lg px-2 py-1 text-[11px]',
				md: 'gap-2 rounded-lg px-2.5 py-1.5 text-xs'
			}
		},
		defaultVariants: {
			size: 'default'
		}
	}
);

export interface TTooltipProps
	extends TooltipPrimitive.Root.Props, VariantProps<typeof tooltipVariants> {
	children: React.ReactElement;
	content: React.ReactNode;
	shortcut?: string;
	side?: 'top' | 'bottom' | 'left' | 'right';
	delay?: number;
	className?: string;
}
