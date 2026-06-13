import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { useAppInfo, usePlatform } from '@/hooks';
import { cn } from '@/lib';
import { useUpdaterCx } from '@/modules/updater';
import { Badge, MoveRightIcon } from '../display';

export const WindowHeader: React.FC<TWindowHeaderProps> = (props) => {
	const {
		title,
		floating = true,
		compact = false,
		showBadges = true,
		leading,
		trailing,
		className
	} = props;
	const appInfo = useAppInfo();
	const navigate = useNavigate();
	const { pathname, hash } = useLocation({
		select: (location) => ({
			pathname: location.pathname,
			hash: location.hash
		})
	});
	const updaterCx = useUpdaterCx();
	const updateState = useFeatureState(updaterCx.$updateState);

	const isViewingUpdatesSettings =
		pathname === '/window/main/settings/general' && hash === 'updates';
	const hasAvailableUpdate = updateState.type === 'available';
	const showUpdateBadge = showBadges && !isViewingUpdatesSettings && hasAvailableUpdate;
	const showDevBadge =
		showBadges && !hasAvailableUpdate && !appInfo.isPending && appInfo.stage === 'dev';
	const showBetaBadge =
		showBadges &&
		!hasAvailableUpdate &&
		!appInfo.isPending &&
		appInfo.stage === 'prod' &&
		appInfo.version.startsWith('v0.') &&
		appInfo.distribution !== 'appStore';

	// MARK: - Actions

	const handleOpenUpdates = React.useCallback(() => {
		void navigate({
			to: '/window/main/settings/general',
			hash: 'updates'
		});
	}, [navigate]);

	// MARK: - UI

	return (
		<WindowHeaderRow
			render={<header />}
			className={cn('flex px-5', floating && 'absolute inset-x-0 top-0 z-10', className)}
		>
			<WindowControlsInset />
			{leading}
			{(title != null || showDevBadge || showBetaBadge || showUpdateBadge) && !compact && (
				<div className="ml-2 flex min-w-0 items-center gap-2">
					{title != null && (
						<span className="text-base-950 truncate text-sm font-semibold">{title}</span>
					)}
					{showDevBadge && (
						<Badge variant="warning" className="font-semibold tracking-wide uppercase">
							Dev
						</Badge>
					)}
					{showBetaBadge && (
						<Badge variant="secondary" className="font-semibold tracking-wide uppercase">
							Beta
						</Badge>
					)}
					{showUpdateBadge && (
						<Badge
							render={<button type="button" aria-label="Open update settings" />}
							variant="default"
							className="bg-primary text-primary-content hover:bg-primary/90 group/update-badge gap-0 font-semibold"
							onClick={handleOpenUpdates}
						>
							Update
							<MoveRightIcon
								aria-hidden
								className="ml-0 size-3.5 w-0 opacity-0 transition-[width,margin,opacity] group-hover/update-badge:ml-1 group-hover/update-badge:w-3.5 group-hover/update-badge:opacity-100 group-focus-visible/update-badge:ml-1 group-focus-visible/update-badge:w-3.5 group-focus-visible/update-badge:opacity-100"
							/>
						</Badge>
					)}
				</div>
			)}
			<div data-tauri-drag-region className="h-full flex-1" />
			{trailing}
		</WindowHeaderRow>
	);
};

export interface TWindowHeaderProps {
	title?: string;
	floating?: boolean;
	compact?: boolean;
	showBadges?: boolean;
	leading?: React.ReactNode;
	trailing?: React.ReactNode;
	className?: string;
}

export const WindowHeaderRow: React.FC<TWindowHeaderRowProps> = (props) => {
	const { render, className, ...rest } = props;

	return useRender({
		defaultTagName: 'div',
		props: mergeProps<'div'>(
			{
				className: cn('flex h-11 shrink-0 items-center select-none', className)
			},
			rest
		),
		render
	});
};

export type TWindowHeaderRowProps = useRender.ComponentProps<'div'>;

/** Spacer for the macOS traffic light buttons. Zero-width on other platforms. */
export const WindowControlsInset: React.FC = () => {
	const platform = usePlatform();

	return (
		<div
			data-tauri-drag-region
			className={cn(platform === 'macos' ? 'h-full w-15 shrink-0' : 'h-full w-0')}
		/>
	);
};

/**
 * Renders a sticky page header with separate foreground and background slots.
 *
 * Keep interactive controls in `foreground` so they stay clickable above the shell header chrome and drag regions.
 * Use `background` for the pinned header surface so blur, border, or fill treatment can sit underneath shell-owned controls.
 */
export const StickyPageHeader: React.FC<TStickyPageHeaderProps> = (props) => {
	const {
		foreground,
		background = <WindowHeaderRow />,
		foregroundClassName,
		backgroundClassName
	} = props;

	return (
		<>
			<div className="pointer-events-none sticky top-0 z-10 h-0">
				<WindowHeaderRow className={foregroundClassName}>{foreground}</WindowHeaderRow>
			</div>
			<div className={cn('sticky top-0 z-5', backgroundClassName)}>{background}</div>
		</>
	);
};

export interface TStickyPageHeaderProps {
	foreground?: React.ReactNode;
	background?: React.ReactNode;
	foregroundClassName?: string;
	backgroundClassName?: string;
}
