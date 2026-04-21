import { Link } from '@tanstack/react-router';
import React from 'react';
import { cn } from '@/lib';
import type { FileRouteTypes } from '@/routeTree.gen';
import { ArrowLeftIcon } from '../display';
import { Button } from '../input';
import { StickyPageHeaderLayers } from './WindowHeader';

export const ContentPage: React.FC<TContentPageProps> = (props) => {
	const {
		title,
		subtitle,
		backTo,
		backLabel = 'Back',
		header,
		collapsedHeader,
		children,
		collapseAt = 48,
		className,
		headerClassName,
		contentClassName
	} = props;
	const [isCollapsed, setIsCollapsed] = React.useState(false);
	const hasBackButton = backTo != null;

	// MARK: - Actions

	const handleScroll = React.useCallback(
		(event: React.UIEvent<HTMLElement>) => {
			setIsCollapsed(event.currentTarget.scrollTop > collapseAt);
		},
		[collapseAt]
	);

	// MARK: - UI

	return (
		<main
			className={cn('flex min-h-0 flex-1 flex-col overflow-y-auto', className)}
			onScroll={handleScroll}
		>
			<StickyPageHeaderLayers
				foreground={
					<>
						{hasBackButton && (
							<Button
								render={<Link to={backTo} />}
								variant="outline"
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
					</>
				}
				foregroundClassName={cn(
					isCollapsed || hasBackButton ? 'mx-auto w-full max-w-2xl px-6' : 'max-w-0 opacity-0',
					headerClassName
				)}
				backgroundClassName={cn(
					isCollapsed &&
						'border-base-100 bg-base-0/90 border-b supports-backdrop-filter:bg-base-0/80 supports-backdrop-filter:backdrop-blur-xl',
					!isCollapsed &&
						hasBackButton &&
						"before:from-base-0 before:pointer-events-none before:absolute before:h-16 before:w-full before:bg-linear-to-b before:from-55% before:to-transparent before:content-['']"
				)}
			/>

			<div className={cn('mx-auto w-full max-w-2xl px-6 pt-4 pb-10', contentClassName)}>
				{header ?? (
					<div className="mb-5">
						<h1 className="text-base-950 text-xl font-semibold">{title}</h1>
						{subtitle != null && <p className="text-base-500 mt-1 text-sm">{subtitle}</p>}
					</div>
				)}
				{children}
			</div>
		</main>
	);
};

interface TContentPageProps {
	title: React.ReactNode;
	subtitle?: React.ReactNode;
	backTo?: FileRouteTypes['to'];
	backLabel?: string;
	header?: React.ReactNode;
	collapsedHeader?: React.ReactNode;
	children?: React.ReactNode;
	collapseAt?: number;
	className?: string;
	headerClassName?: string;
	contentClassName?: string;
}
