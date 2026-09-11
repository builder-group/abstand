import { useEventCallback } from 'feature-react/state';
import React from 'react';
import { cn } from '@/lib';
import { Button, type TButtonProps } from './Button';
import './TimedIconButton.css';

export const TimedIconButton: React.FC<TTimedIconButtonProps> = (props) => {
	const {
		children,
		className,
		duration,
		onProgressComplete,
		paused = false,
		resetKey,
		showProgress = true,
		size = 'icon-sm',
		variant = 'ghost',
		...rest
	} = props;

	const hasTimer = duration != null && duration > 0;
	const timerKey = hasTimer ? `${duration}:${String(resetKey)}` : null;
	const [completedTimerKey, setCompletedTimerKey] = React.useState<string | null>(null);
	const isTimerComplete = timerKey != null && completedTimerKey === timerKey;

	const isProgressVisible = showProgress && hasTimer && !isTimerComplete;

	const handleComplete = useEventCallback(() => {
		if (timerKey == null) {
			return;
		}

		setCompletedTimerKey(timerKey);
		onProgressComplete?.();
	});

	return (
		<Button
			data-slot="timed-icon-button"
			variant={variant}
			size={size}
			className={cn('relative overflow-visible', className)}
			{...rest}
		>
			{hasTimer && !isTimerComplete && (
				// Note: Reduced motion hides the visual ring only so timed actions still complete
				<svg
					key={timerKey}
					aria-hidden
					className={cn(
						'pointer-events-none absolute inset-0 size-full -rotate-90 motion-reduce:opacity-0',
						!isProgressVisible && 'opacity-0'
					)}
					viewBox="0 0 28 28"
				>
					<circle
						className="stroke-current opacity-15"
						cx="14"
						cy="14"
						r="13"
						fill="none"
						pathLength={1}
						strokeWidth="1.5"
					/>
					<circle
						className="timed-icon-button-progress stroke-current opacity-60"
						cx="14"
						cy="14"
						r="13"
						fill="none"
						pathLength={1}
						strokeDasharray={1}
						strokeDashoffset={0}
						strokeLinecap="round"
						strokeWidth="1.5"
						style={{
							animationDuration: `${duration}ms`,
							animationPlayState: paused ? 'paused' : 'running'
						}}
						onAnimationEnd={handleComplete}
					/>
				</svg>
			)}
			<span className="relative z-10 inline-flex items-center justify-center">{children}</span>
		</Button>
	);
};

export type TTimedIconButtonProps = Omit<TButtonProps, 'size'> & {
	size?: TTimedIconButtonSize;
	/** How long the timed action runs in milliseconds. Omit or pass 0 to render a normal icon button. */
	duration?: number;
	/** Called once the timed action finishes. */
	onProgressComplete?: () => void;
	/** Pauses the countdown at its current progress without resetting it. */
	paused?: boolean;
	/** Changes to this value restart the timed action. */
	resetKey?: React.Key;
	/** Controls only the visual progress ring. The timer still runs when progress is hidden. */
	showProgress?: boolean;
};

type TTimedIconButtonSize = Extract<TButtonProps['size'], 'icon-xs' | 'icon-sm' | 'icon-md'>;
