import { Toast as ToastPrimitive } from '@base-ui/react/toast';
import React from 'react';
import { useWindowFocused } from '@/hooks';
import { cn } from '@/lib';
import { TimedIconButton } from '../../input/TimedIconButton';
import { CircleQuestionMarkIcon, XCircleIcon, XIcon } from '../icons';
import type { TToastData, TToastObject, TToastType } from './types';

export const ToastViewport: React.FC<TToastViewportProps> = (props) => {
	const { dismissAfterMs } = props;

	return (
		<ToastPrimitive.Portal>
			<ToastPrimitive.Viewport
				data-slot="toast-viewport"
				className="pointer-events-none fixed inset-0 z-60 outline-none"
			>
				<ToastStack dismissAfterMs={dismissAfterMs} />
			</ToastPrimitive.Viewport>
		</ToastPrimitive.Portal>
	);
};

interface TToastViewportProps {
	dismissAfterMs: number;
}

const ToastStack: React.FC<TToastStackProps> = (props) => {
	const { dismissAfterMs } = props;
	const { close, toasts } = ToastPrimitive.useToastManager<TToastData>();

	if (!toasts.length) {
		return null;
	}

	return (
		<div className="pointer-events-none absolute right-3 bottom-3 h-(--toast-frontmost-height) w-[min(22rem,calc(100vw-1.5rem))]">
			{toasts.map((toast) => (
				<ToastItem key={toast.id} toast={toast} dismissAfterMs={dismissAfterMs} onClose={close} />
			))}
		</div>
	);
};

interface TToastStackProps {
	dismissAfterMs: number;
}

const ToastItem: React.FC<TToastItemProps> = (props) => {
	const { dismissAfterMs, onClose, toast } = props;

	const hasSecondaryContent = toast.description != null || toast.data?.action != null;
	const resolvedDismissAfterMs = toast._dismissAfterMs ?? dismissAfterMs;
	const hasCloseTimer =
		toast.type !== 'loading' && resolvedDismissAfterMs > 0 && toast.transitionStatus !== 'ending';

	return (
		<ToastPrimitive.Root
			data-slot="toast-root"
			toast={toast}
			swipeDirection={['down', 'right']}
			className={cn(
				'bg-base-0/90 supports-backdrop-filter:bg-base-0/80 border-base-100 text-base-950',
				'data-[type=destructive]:border-error/25 data-[type=destructive]:bg-error/10',
				'data-[type=error]:border-error/25 data-[type=error]:bg-error/10',
				'data-[type=warning]:border-warning/25 data-[type=warning]:bg-warning/10',
				'data-[type=success]:border-success/20 data-[type=success]:bg-success/10',
				'data-[type=info]:border-secondary/20 data-[type=info]:bg-secondary/10',
				'data-[type=loading]:border-secondary/20 data-[type=loading]:bg-secondary/10',
				"pointer-events-auto absolute inset-x-0 bottom-0 w-full rounded-xl border shadow-xl outline-none select-none after:absolute after:top-full after:left-0 after:h-2 after:w-full after:content-[''] supports-backdrop-filter:backdrop-blur-xl",
				'[transition:transform_0.5s_cubic-bezier(0.22,1,0.36,1),opacity_0.5s,height_0.15s]',
				'data-ending-style:opacity-0 data-limited:opacity-0 data-starting-style:opacity-0'
			)}
			style={(state) =>
				({
					'--toast-stack-gap': '0.5rem',
					'--toast-stack-peek': '0.35rem',
					'--toast-stack-scale': 'calc(max(0, 1 - (var(--toast-index) * 0.03)))',
					'--toast-stack-shrink': 'calc(1 - var(--toast-stack-scale))',
					'--toast-stack-height': 'var(--toast-frontmost-height, var(--toast-height))',
					'zIndex': 'calc(1000 - var(--toast-index))',
					'height': state.expanded ? 'var(--toast-height)' : 'var(--toast-stack-height)',
					'transform': getToastTransform(state),
					'transformOrigin': 'bottom right'
				}) as React.CSSProperties
			}
		>
			<ToastPrimitive.Content
				data-slot="toast-content"
				className="overflow-hidden rounded-[inherit] transition-opacity duration-200 ease-out data-behind:pointer-events-none data-behind:opacity-0 data-expanded:pointer-events-auto data-expanded:opacity-100"
				render={(contentProps, contentState) => (
					<div {...contentProps}>
						<div
							className={cn(
								'flex gap-2.5 px-3 py-2.5',
								hasSecondaryContent ? 'items-start' : 'items-center'
							)}
						>
							<ToastLeading align={hasSecondaryContent ? 'start' : 'center'} toast={toast} />
							<div className="min-w-0 flex-1">
								{toast.title != null && (
									<ToastPrimitive.Title
										data-slot="toast-title"
										className="text-sm font-medium tracking-normal"
									/>
								)}
								{toast.description != null && (
									<ToastPrimitive.Description
										data-slot="toast-description"
										className="text-base-500 text-sm leading-5"
									/>
								)}
								{toast.data?.action != null && (
									<div data-slot="toast-action" data-base-ui-swipe-ignore="" className="mt-1.5">
										{toast.data.action}
									</div>
								)}
							</div>
							<ToastCloseButton
								key={toast.updateKey}
								expanded={contentState.expanded}
								duration={hasCloseTimer ? resolvedDismissAfterMs : undefined}
								align={hasSecondaryContent ? 'start' : 'center'}
								onProgressComplete={hasCloseTimer ? () => onClose(toast.id) : undefined}
							/>
						</div>
					</div>
				)}
			/>
		</ToastPrimitive.Root>
	);
};

interface TToastItemProps {
	toast: TToastObject;
	dismissAfterMs: number;
	onClose: (toastId: string) => void;
}

function getToastTransform(state: ToastPrimitive.Root.State): string {
	const expandedOffsetY =
		'calc((var(--toast-offset-y) * -1) - (var(--toast-index) * var(--toast-stack-gap)) + var(--toast-swipe-movement-y))';
	const collapsedOffsetY =
		'calc(var(--toast-swipe-movement-y) - (var(--toast-index) * var(--toast-stack-peek)) - (var(--toast-stack-shrink) * var(--toast-stack-height)))';
	const offsetY = state.expanded ? expandedOffsetY : collapsedOffsetY;

	if (state.transitionStatus === 'starting') {
		return 'translateY(150%)';
	}

	if (state.transitionStatus === 'ending' && state.swipeDirection == null) {
		return 'translateY(150%)';
	}

	if (state.transitionStatus === 'ending' && state.swipeDirection === 'right') {
		return `translateX(calc(var(--toast-swipe-movement-x) + 150%)) translateY(${offsetY})`;
	}

	if (state.transitionStatus === 'ending' && state.swipeDirection === 'down') {
		return 'translateY(calc(var(--toast-swipe-movement-y) + 150%))';
	}

	if (state.expanded) {
		return `translateX(var(--toast-swipe-movement-x)) translateY(${offsetY})`;
	}

	return `translateX(var(--toast-swipe-movement-x)) translateY(${offsetY}) scale(var(--toast-stack-scale))`;
}

const ToastCloseButton: React.FC<TToastCloseButtonProps> = (props) => {
	const { align, duration, expanded, onProgressComplete } = props;

	const windowFocused = useWindowFocused();
	const paused = expanded || !windowFocused;

	return (
		<ToastPrimitive.Close
			render={
				<TimedIconButton
					data-slot="toast-close"
					aria-label="Dismiss notification"
					duration={duration}
					onProgressComplete={onProgressComplete}
					paused={paused}
					className={cn('text-base-400 hover:text-base-950 -mr-1', align === 'start' && '-mt-1')}
				>
					<XIcon className="size-3.5" />
				</TimedIconButton>
			}
		/>
	);
};

interface TToastCloseButtonProps {
	align: TToastContentAlignment;
	duration?: number;
	expanded: boolean;
	onProgressComplete?: () => void;
}

const ToastLeading: React.FC<TToastLeadingProps> = (props) => {
	const { align, toast } = props;

	if (toast.data?.icon != null) {
		return <>{toast.data.icon}</>;
	}

	switch (toast.type as TToastType | undefined) {
		case 'warning':
			return (
				<CircleQuestionMarkIcon
					className={cn('text-warning size-4 shrink-0', align === 'start' && 'mt-0.5')}
				/>
			);
		case 'destructive':
		case 'error':
			return (
				<XCircleIcon className={cn('text-error size-4 shrink-0', align === 'start' && 'mt-0.5')} />
			);
		default:
			return null;
	}
};

interface TToastLeadingProps {
	align: TToastContentAlignment;
	toast: TToastObject;
}

type TToastContentAlignment = 'center' | 'start';
