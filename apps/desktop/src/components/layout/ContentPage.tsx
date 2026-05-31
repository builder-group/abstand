import { Link } from '@tanstack/react-router';
import React from 'react';
import { cn } from '@/lib';
import type { FileRouteTypes } from '@/routeTree.gen';
import { ArrowLeftIcon } from '../display';
import { Button } from '../input';
import { StickyPageHeader } from './WindowHeader';

export const ContentPage: React.FC<TContentPageProps> = (props) => {
	const {
		title,
		subtitle,
		backTo,
		backLabel = 'Back',
		header,
		trailing,
		footer,
		collapsedHeader,
		collapseAt = 42,
		children,
		headerClassName,
		contentClassName,
		footerClassName,
		className
	} = props;
	const mainRef = React.useRef<HTMLElement | null>(null);
	const contentRef = React.useRef<HTMLDivElement | null>(null);

	const [isCollapsed, setIsCollapsed] = React.useState(false);
	const [hasOverflowingContent, setHasOverflowingContent] = React.useState(false);

	const hasBackButton = backTo != null;
	const hasTrailing = trailing != null;
	const hasFooter = footer != null;

	// MARK: - Actions

	const handleScroll = React.useCallback(
		(event: React.UIEvent<HTMLElement>) => {
			setIsCollapsed(event.currentTarget.scrollTop > collapseAt);
		},
		[collapseAt]
	);

	const updateOverflowingContent = React.useCallback(() => {
		const main = mainRef.current;
		if (main == null) {
			return;
		}

		setHasOverflowingContent(main.scrollHeight > main.clientHeight + 1);
	}, []);

	// MARK: - Effects

	React.useLayoutEffect(() => {
		updateOverflowingContent();

		const main = mainRef.current;
		const content = contentRef.current;
		if (main == null || content == null) {
			return;
		}

		const resizeObserver = new ResizeObserver(() => {
			updateOverflowingContent();
		});

		resizeObserver.observe(main);
		resizeObserver.observe(content);

		return () => {
			resizeObserver.disconnect();
		};
	}, [updateOverflowingContent]);

	// MARK: - UI

	return (
		<main
			ref={mainRef}
			className={cn('@container flex min-h-0 flex-1 flex-col overflow-y-auto', className)}
			onScroll={handleScroll}
		>
			<StickyPageHeader
				foreground={
					<>
						{hasBackButton && (
							<Button
								render={<Link to={backTo} />}
								variant="soft"
								size={isCollapsed ? 'icon-sm' : 'sm'}
								className="pointer-events-auto rounded-full"
							>
								<ArrowLeftIcon />
								<span className={cn('overflow-hidden whitespace-nowrap', isCollapsed && 'max-w-0')}>
									{backLabel}
								</span>
							</Button>
						)}
						<div
							className={cn(
								'min-w-0 overflow-hidden',
								hasBackButton ? 'ml-2' : 'ml-0',
								isCollapsed ? 'max-w-80 opacity-100' : 'max-w-0 opacity-0'
							)}
						>
							{collapsedHeader ?? (
								<span className="text-base-950 block truncate text-sm font-semibold">{title}</span>
							)}
						</div>
						{hasTrailing && isCollapsed && (
							<>
								<div className="flex-1" />
								<div className="pointer-events-auto flex items-center gap-2">{trailing}</div>
							</>
						)}
					</>
				}
				foregroundClassName={cn(
					isCollapsed || hasBackButton ? 'mx-auto w-full max-w-2xl px-5' : 'max-w-0 opacity-0',
					headerClassName
				)}
				backgroundClassName={cn(
					isCollapsed &&
						'border-base-100 bg-base-0/90 supports-backdrop-filter:bg-base-0/80 border-b supports-backdrop-filter:backdrop-blur-xl',
					!isCollapsed &&
						hasBackButton &&
						"before:from-base-0 before:pointer-events-none before:absolute before:h-16 before:w-full before:bg-linear-to-b before:from-55% before:to-transparent before:content-['']"
				)}
			/>

			<div
				ref={contentRef}
				className={cn('mx-auto w-full max-w-2xl px-5 pt-2 pb-5', contentClassName)}
			>
				{header ?? (
					<div className="mb-5 flex flex-wrap items-start justify-between gap-3">
						<div className="min-w-0 flex-1">
							<h1 className="text-base-950 text-lg font-semibold">{title}</h1>
							{subtitle != null && <p className="text-base-500 text-sm">{subtitle}</p>}
						</div>
						{hasTrailing && <div className="flex shrink-0 items-center gap-2">{trailing}</div>}
					</div>
				)}
				{children}
			</div>
			{hasFooter && (
				<div
					className={cn(
						'pointer-events-none sticky inset-x-0 bottom-0 z-10 mt-auto',
						hasOverflowingContent
							? 'border-base-100 bg-base-0/90 supports-backdrop-filter:bg-base-0/80 border-t supports-backdrop-filter:backdrop-blur-xl'
							: 'bg-base-0'
					)}
				>
					<div
						className={cn(
							'pointer-events-auto mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-5 pt-3 pb-5',
							footerClassName
						)}
					>
						{footer}
					</div>
				</div>
			)}
		</main>
	);
};

export interface TContentPageProps {
	title: React.ReactNode;
	subtitle?: React.ReactNode;
	backTo?: FileRouteTypes['to'];
	backLabel?: string;
	header?: React.ReactNode;
	trailing?: React.ReactNode;
	footer?: React.ReactNode;
	collapsedHeader?: React.ReactNode;
	collapseAt?: number;
	children?: React.ReactNode;
	headerClassName?: string;
	contentClassName?: string;
	footerClassName?: string;
	className?: string;
}
