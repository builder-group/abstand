import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import React from 'react';
import { useAppInfo, usePlatform } from '@/hooks';
import { cn } from '@/lib';
import { Badge, CircleQuestionMarkIcon } from '../display';
import { Button } from '../input';

export const WindowHeader: React.FC<TWindowHeaderProps> = (props) => {
	const { title, floating = true, compact = false, childrenStart, childrenEnd, className } = props;
	const appInfo = useAppInfo();

	const showDevBadge = !appInfo.isPending && appInfo.stage === 'dev';
	const showBetaBadge =
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
			{childrenStart}
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
			{childrenEnd}
			<Button aria-label="Help" variant="ghost" size="icon-sm" className="ml-2">
				<CircleQuestionMarkIcon />
			</Button>
		</WindowHeaderRow>
	);
};

interface TWindowHeaderProps {
	title?: string;
	floating?: boolean;
	compact?: boolean;
	childrenStart?: React.ReactNode;
	childrenEnd?: React.ReactNode;
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

type TWindowHeaderRowProps = useRender.ComponentProps<'div'>;

export const WindowControlsInset: React.FC = () => {
	const platform = usePlatform();

	return (
		<div
			data-tauri-drag-region
			className={cn(platform === 'macos' ? 'h-full w-[60px] shrink-0' : 'h-full w-0')}
		/>
	);
};
