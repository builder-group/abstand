import React from 'react';
import { cn } from '@/lib';
import { Button, type TButtonProps } from './Button';

export const TimedIconButton: React.FC<TTimedIconButtonProps> = (props) => {
	const {
		children,
		className,
		duration,
		paused = false,
		showProgress = true,
		size = 'icon-sm',
		variant = 'ghost',
		...rest
	} = props;
	const hasProgress = showProgress && duration != null && duration > 0;

	const circleRef = React.useRef<SVGCircleElement>(null);
	const animRef = React.useRef<Animation | null>(null);

	// Note: Keep animation creation separate from playback so pause/resume preserves progress
	React.useEffect(() => {
		if (!hasProgress || !circleRef.current) return;

		const anim = circleRef.current.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: 1 }], {
			duration,
			fill: 'forwards',
			easing: 'linear'
		});
		anim.pause();
		animRef.current = anim;

		return () => {
			anim.cancel();
			animRef.current = null;
		};
	}, [duration, hasProgress]);

	React.useEffect(() => {
		const anim = animRef.current;
		if (!anim) return;

		if (paused) {
			anim.pause();
		} else if (anim.playState === 'finished') {
			// Reset the fill state before replaying a completed countdown
			anim.cancel();
			anim.play();
		} else {
			anim.play();
		}
	}, [paused, duration, hasProgress]);

	return (
		<Button
			data-slot="timed-icon-button"
			variant={variant}
			size={size}
			className={cn('relative overflow-visible', className)}
			{...rest}
		>
			{hasProgress && (
				<svg
					aria-hidden
					className="pointer-events-none absolute inset-0 size-full -rotate-90 motion-reduce:hidden"
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
						ref={circleRef}
						className="stroke-current opacity-60"
						cx="14"
						cy="14"
						r="13"
						fill="none"
						pathLength={1}
						strokeDasharray={1}
						strokeDashoffset={0}
						strokeLinecap="round"
						strokeWidth="1.5"
					/>
				</svg>
			)}
			<span className="relative z-10 inline-flex items-center justify-center">{children}</span>
		</Button>
	);
};

export type TTimedIconButtonProps = Omit<TButtonProps, 'size'> & {
	/** How long the countdown runs in milliseconds. */
	duration?: number;
	/** Pauses the countdown without resetting it. */
	paused?: boolean;
	size?: TTimedIconButtonSize;
	showProgress?: boolean;
};

type TTimedIconButtonSize = Extract<TButtonProps['size'], 'icon-xs' | 'icon-sm' | 'icon-md'>;
