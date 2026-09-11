import { cva } from 'class-variance-authority';
import { useEventCallback } from 'feature-react/state';
import React from 'react';
import { cn } from '@/lib';
import { Button, type TButtonProps } from './Button';
import './TimedButton.css';

export const TimedButton: React.FC<TTimedButtonProps> = (props) => {
	const {
		children,
		className,
		disabled,
		duration,
		onProgressComplete,
		paused = false,
		resetKey,
		showProgress = true,
		variant = 'default',
		...rest
	} = props;

	const hasTimer = duration != null && duration > 0;
	const timerKey = hasTimer ? `${duration}:${String(resetKey)}` : null;
	const [completedTimerKey, setCompletedTimerKey] = React.useState<string | null>(null);
	const isTimerComplete = timerKey != null && completedTimerKey === timerKey;

	const isLocked = timerKey != null && !isTimerComplete;
	const isProgressVisible = showProgress && isLocked;

	const handleComplete = useEventCallback(() => {
		if (timerKey == null) {
			return;
		}

		setCompletedTimerKey(timerKey);
		onProgressComplete?.();
	});

	return (
		<Button
			data-slot="timed-button"
			variant={variant}
			className={cn(timedButtonVariants({ locked: isLocked }), className)}
			disabled={disabled || isLocked}
			{...rest}
		>
			{hasTimer && !isTimerComplete && (
				// Note: Reduced motion hides the visual fill only so timed actions still complete
				<span
					key={timerKey}
					aria-hidden
					className={cn(
						'timed-button-progress bg-base-100 pointer-events-none absolute inset-y-0 left-0 z-1 w-full motion-reduce:opacity-0',
						!isProgressVisible && 'opacity-0'
					)}
					style={{
						animationDuration: `${duration}ms`,
						animationPlayState: paused ? 'paused' : 'running'
					}}
					onAnimationEnd={handleComplete}
				/>
			)}
			<span
				className="relative z-10 inline-flex items-center justify-center"
				style={{ gap: 'inherit' }}
			>
				{children}
			</span>
		</Button>
	);
};

export type TTimedButtonProps = TButtonProps & TTimedActionProps;

interface TTimedActionProps {
	/** How long the action stays locked in milliseconds. Omit or pass 0 to render a normal button. */
	duration?: number;
	/** Called once the timed lock finishes. */
	onProgressComplete?: () => void;
	/** Pauses the countdown at its current progress without resetting it. */
	paused?: boolean;
	/** Changes to this value restart the timed action. */
	resetKey?: React.Key;
	/** Controls only the visual progress fill. The timer still runs when progress is hidden. */
	showProgress?: boolean;
}

const timedButtonVariants = cva('relative isolate overflow-hidden', {
	variants: {
		locked: {
			true: 'bg-base-100/50 text-base-500 hover:bg-base-100/50 aria-expanded:bg-base-100/50 disabled:opacity-100',
			false: ''
		}
	},
	defaultVariants: {
		locked: false
	}
});
