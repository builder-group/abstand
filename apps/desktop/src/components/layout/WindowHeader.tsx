import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import React from 'react';
import { appConfig } from '@/environment/configs';
import { useAppInfo, usePlatform } from '@/hooks';
import { cn, openExternalUrl } from '@/lib';
import {
	Badge,
	BugIcon,
	CircleQuestionMarkIcon,
	MailIcon,
	MessageCircleIcon,
	Popover,
	PopoverClose,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger
} from '../display';
import { Button } from '../input';

export const WindowHeader: React.FC<TWindowHeaderProps> = (props) => {
	const {
		title,
		floating = true,
		compact = false,
		showBadges = true,
		showHelp = true,
		leading,
		trailing,
		className
	} = props;
	const appInfo = useAppInfo();

	const showDevBadge = showBadges && !appInfo.isPending && appInfo.stage === 'dev';
	const showBetaBadge =
		showBadges &&
		!appInfo.isPending &&
		appInfo.stage === 'prod' &&
		appInfo.version.startsWith('v0.') &&
		appInfo.distribution !== 'appStore';

	return (
		<WindowHeaderRow
			render={<header />}
			className={cn('flex px-4', floating && 'absolute inset-x-0 top-0 z-10', className)}
		>
			<WindowControlsInset />
			{leading}
			{(title != null || showDevBadge || showBetaBadge) && !compact && (
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
				</div>
			)}
			<div data-tauri-drag-region className="h-full flex-1" />
			{trailing}
			{showHelp && <WindowHeaderHelpPopover />}
		</WindowHeaderRow>
	);
};

export interface TWindowHeaderProps {
	title?: string;
	floating?: boolean;
	compact?: boolean;
	showBadges?: boolean;
	showHelp?: boolean;
	leading?: React.ReactNode;
	trailing?: React.ReactNode;
	className?: string;
}

const WindowHeaderHelpPopover: React.FC = () => {
	const handleOpenSupportUrl = React.useCallback((url: string) => {
		void openExternalUrl(url);
	}, []);

	return (
		<Popover>
			<PopoverTrigger
				render={
					<Button aria-label="Help" variant="ghost" size="icon-sm" className="ml-2">
						<CircleQuestionMarkIcon />
					</Button>
				}
			/>
			<PopoverContent side="bottom" align="end" className="w-56">
				<PopoverHeader>
					<PopoverTitle>Support</PopoverTitle>
					<PopoverDescription>Get help or share feedback.</PopoverDescription>
				</PopoverHeader>
				<div className="-mx-1 flex flex-col gap-0.5">
					{supportLinks.map((link) => (
						<PopoverClose
							key={link.label}
							type="button"
							className="text-base-600 hover:bg-base-950/6 hover:text-base-950 focus-ring flex w-full items-center gap-2 rounded-lg border border-transparent px-2 py-1 text-left text-sm transition-colors select-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
							onClick={() => handleOpenSupportUrl(link.url)}
						>
							<link.Icon />
							<span>{link.label}</span>
						</PopoverClose>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
};

const supportLinks = [
	{
		label: 'Join Discord',
		url: appConfig.help.discord,
		Icon: MessageCircleIcon
	},
	{
		label: 'Email support',
		url: appConfig.help.mailto('Support'),
		Icon: MailIcon
	},
	{
		label: 'Report issue',
		url: appConfig.help.githubIssues,
		Icon: BugIcon
	}
] satisfies TSupportLink[];

interface TSupportLink {
	label: string;
	url: string;
	Icon: React.ComponentType<{ className?: string }>;
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
