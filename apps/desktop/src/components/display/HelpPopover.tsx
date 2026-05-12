import { cn } from '@/lib';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { Button } from '../input/Button';
import { ChevronLeftIcon, ChevronRightIcon, CircleQuestionMarkIcon } from './icons';
import { Popover, PopoverContent, PopoverTrigger, type TPopoverContentProps } from './Popover';

export const HelpPopover: React.FC<THelpPopoverProps> = (props) => {
	const {
		description,
		children,
		ariaLabel = 'Open help',
		size = 'sm',
		side = 'top',
		sideOffset = 6,
		align = 'center',
		alignOffset = 0,
		openOnHover = true,
		delay = 400,
		closeDelay = 150,
		triggerClassName,
		contentClassName
	} = props;

	return (
		<Popover>
			<PopoverTrigger
				openOnHover={openOnHover}
				delay={delay}
				closeDelay={closeDelay}
				render={
					<button
						type="button"
						aria-label={ariaLabel}
						className={cn(helpPopoverTriggerVariants({ size }), triggerClassName)}
					>
						<CircleQuestionMarkIcon />
					</button>
				}
			/>
			<PopoverContent
				side={side}
				sideOffset={sideOffset}
				align={align}
				alignOffset={alignOffset}
				// Keep hover help passive, but let keyboard users reach interactive content like pagination
				initialFocus={(openType) => openType === 'keyboard'}
				className={cn(
					'bg-base-950/90 supports-backdrop-filter:bg-base-950/80 border-base-50/10 text-base-50 w-max max-w-[min(18rem,var(--available-width))] gap-1.5 rounded-lg px-2.5 py-2 shadow-md supports-backdrop-filter:backdrop-blur-md',
					contentClassName
				)}
			>
				{description != null && <p className="text-base-50 text-xs font-medium">{description}</p>}
				{description != null && children != null && <hr className="border-base-50/10 -mx-2.5" />}
				{children}
			</PopoverContent>
		</Popover>
	);
};

export interface THelpPopoverProps
	extends
		Pick<TPopoverContentProps, 'side' | 'align' | 'sideOffset' | 'alignOffset'>,
		VariantProps<typeof helpPopoverTriggerVariants> {
	description?: React.ReactNode;
	children?: React.ReactNode;
	ariaLabel?: string;
	openOnHover?: boolean;
	delay?: number;
	closeDelay?: number;
	triggerClassName?: string;
	contentClassName?: string;
}

const helpPopoverTriggerVariants = cva(
	'focus-ring text-base-400 hover:text-base-700 inline-flex shrink-0 items-center justify-center rounded-full transition-colors [&_svg]:pointer-events-none [&_svg]:shrink-0',
	{
		variants: {
			size: {
				sm: "size-5 [&_svg:not([class*='size-'])]:size-3.5",
				md: "size-7 [&_svg:not([class*='size-'])]:size-4"
			}
		},
		defaultVariants: {
			size: 'sm'
		}
	}
);

export const HelpCarousel: React.FC<THelpCarouselProps> = (props) => {
	const { items, action, className } = props;
	const [page, setPage] = React.useState(0);

	const handleKeyDown = React.useCallback(
		(event: React.KeyboardEvent) => {
			if (event.key === 'ArrowLeft') {
				event.preventDefault();
				setPage((p) => getNormalizedCarouselPage(p - 1, items.length));
			} else if (event.key === 'ArrowRight') {
				event.preventDefault();
				setPage((p) => getNormalizedCarouselPage(p + 1, items.length));
			}
		},
		[items.length]
	);

	if (items.length === 0) {
		return null;
	}

	const currentPage = getNormalizedCarouselPage(page, items.length);
	const current = items[currentPage] as THelpCarouselItem;

	return (
		<div
			data-slot="help-carousel"
			onKeyDown={handleKeyDown}
			className={cn(
				// Note: Keep the carousel at a fixed width so layout does not jump as pages with different content lengths are shown
				'flex w-64 flex-col gap-1',
				className
			)}
		>
			<div className="flex flex-col gap-0.5">
				<div className="flex items-center gap-1.5">
					{current.titlePrefix != null && (
						<span className="text-base-400 text-xs">{current.titlePrefix} &rsaquo;</span>
					)}
					<span className="text-base-50 text-xs font-medium">{current.title}</span>
					{current.titleSuffix}
				</div>
				<p className="text-base-200 text-xs">{current.description}</p>
			</div>
			{items.length > 1 && (
				<div className="flex items-center justify-between">
					{action != null && <div className="text-base-400 text-xs">{action}</div>}
					<div className="ml-auto flex items-center gap-0.5">
						<Button
							size="icon-xs"
							variant="ghost"
							aria-label="Previous"
							onClick={() => setPage(getNormalizedCarouselPage(currentPage - 1, items.length))}
							className="text-base-300 hover:text-base-50 hover:bg-base-50/10"
						>
							<ChevronLeftIcon />
						</Button>
						<span className="text-base-400 w-6 text-center text-xs tabular-nums">
							{currentPage + 1} / {items.length}
						</span>
						<Button
							size="icon-xs"
							variant="ghost"
							aria-label="Next"
							onClick={() => setPage(getNormalizedCarouselPage(currentPage + 1, items.length))}
							className="text-base-300 hover:text-base-50 hover:bg-base-50/10"
						>
							<ChevronRightIcon />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
};

export interface THelpCarouselProps {
	items: THelpCarouselItem[];
	action?: React.ReactNode;
	className?: string;
}

export interface THelpCarouselItem {
	title: string;
	description: React.ReactNode;
	titlePrefix?: string;
	titleSuffix?: React.ReactNode;
}

function getNormalizedCarouselPage(page: number, total: number): number {
	return ((page % total) + total) % total;
}

export const HelpPopoverLink: React.FC<React.ComponentProps<'a'>> = (props) => {
	const { children = 'Learn more', className, ...rest } = props;

	return (
		<a
			className={cn(
				'text-base-300 hover:text-base-50 text-xs font-medium underline-offset-4 hover:underline',
				className
			)}
			{...rest}
		>
			{children}
		</a>
	);
};
