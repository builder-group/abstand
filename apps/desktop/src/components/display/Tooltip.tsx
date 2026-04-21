import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import React from 'react';
import { cn } from '@/lib';
import { Kbd } from './Kbd';

export const Tooltip: React.FC<TTooltipProps> = (props) => {
	const {
		children,
		content,
		shortcut,
		side = 'bottom',
		delay = 400,
		disableHoverablePopup = true,
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
						className={cn(
							'bg-base-950/90 text-base-50 border-base-50/10 inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium shadow-md',
							'origin-(--transform-origin) transition-[opacity,scale] duration-150 ease-out',
							'data-starting-style:scale-95 data-starting-style:opacity-0',
							'data-ending-style:scale-95 data-ending-style:opacity-0',
							className
						)}
					>
						{content}
						{shortcut != null && <Kbd>{shortcut}</Kbd>}
					</TooltipPrimitive.Popup>
				</TooltipPrimitive.Positioner>
			</TooltipPrimitive.Portal>
		</TooltipPrimitive.Root>
	);
};

interface TTooltipProps extends TooltipPrimitive.Root.Props {
	children: React.ReactElement;
	content: React.ReactNode;
	shortcut?: string;
	side?: 'top' | 'bottom' | 'left' | 'right';
	delay?: number;
	className?: string;
}
