import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { useStableCallback } from '@/hooks';
import { cn } from '@/lib';
import { ChevronDownIcon, ChevronUpIcon } from '../display';
import { Button, Input, Textarea } from '../input';

const InputGroupContext = React.createContext<TInputGroupContext>({
	size: 'sm'
});

interface TInputGroupContext {
	size: TInputGroupSize;
}

type TInputGroupSize = NonNullable<VariantProps<typeof inputGroupVariants>['size']>;

export const InputGroup: React.FC<TInputGroupProps> = (props) => {
	const { size = 'sm', className, ...rest } = props;

	return (
		<InputGroupContext.Provider value={{ size }}>
			<div
				data-slot="input-group"
				data-size={size}
				role="group"
				className={cn(inputGroupVariants({ size }), className)}
				{...rest}
			/>
		</InputGroupContext.Provider>
	);
};

export interface TInputGroupProps extends React.ComponentProps<'div'> {
	size?: TInputGroupSize;
}

const inputGroupVariants = cva(
	'group/input-group border-base-200 bg-base-0 text-base-950 has-[[data-slot=input-group-control]:focus-visible]:border-primary has-[[data-slot=input-group-control]:focus-visible]:ring-primary/30 has-[[data-slot=input-group-control][aria-invalid=true]]:border-error has-[[data-slot=input-group-control][aria-invalid=true]]:ring-error/20 relative flex w-full min-w-0 items-center border bg-clip-padding transition has-[[data-slot=input-group-control]:disabled]:opacity-50 has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:is(textarea)]:items-stretch has-[[data-slot=input-group-control][aria-invalid=true]]:ring-2 has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:items-stretch has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:items-stretch has-[>[data-slot=input-group-control]:is(textarea)]:h-auto',
	{
		variants: {
			size: {
				sm: 'h-7 rounded-lg',
				md: 'h-8 rounded-lg'
			}
		},
		defaultVariants: {
			size: 'sm'
		}
	}
);

export const InputGroupAddon: React.FC<TInputGroupAddonProps> = (props) => {
	const { align = 'inline-start', onClick, className, ...rest } = props;
	const { size } = React.useContext(InputGroupContext);

	const handleClick = React.useCallback(
		(event: React.MouseEvent<HTMLDivElement>) => {
			onClick?.(event);
			if (event.defaultPrevented || (event.target as HTMLElement).closest('button')) {
				return;
			}

			event.currentTarget.parentElement
				?.querySelector<HTMLElement>('[data-slot="input-group-control"]')
				?.focus();
		},
		[onClick]
	);

	return (
		<div
			role="group"
			data-slot="input-group-addon"
			data-align={align}
			data-size={size}
			className={cn(inputGroupAddonVariants({ align, size }), className)}
			onClick={handleClick}
			{...rest}
		/>
	);
};

export type TInputGroupAddonProps = React.ComponentProps<'div'> &
	Omit<VariantProps<typeof inputGroupAddonVariants>, 'size'>;

const inputGroupAddonVariants = cva(
	'text-base-500 flex shrink-0 cursor-text items-center font-medium select-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
	{
		variants: {
			size: {
				sm: "gap-1 [&>svg:not([class*='size-'])]:size-3.5",
				md: "gap-1.5 [&>svg:not([class*='size-'])]:size-4"
			},
			align: {
				'inline-start': 'order-first pl-2',
				'inline-end': 'order-last pr-2',
				'block-start': 'order-first w-full px-2.5 pt-2',
				'block-end': 'order-last w-full px-2.5 pb-2'
			}
		},
		defaultVariants: {
			size: 'sm',
			align: 'inline-start'
		}
	}
);

export const InputGroupButton: React.FC<TInputGroupButtonProps> = (props) => {
	const { variant = 'ghost', type = 'button', className, ...rest } = props;

	return (
		<Button
			data-slot="input-group-button"
			type={type}
			variant={variant}
			size="icon-xs"
			className={cn('shrink-0 shadow-none', className)}
			{...rest}
		/>
	);
};

export type TInputGroupButtonProps = Omit<React.ComponentProps<typeof Button>, 'size' | 'type'> & {
	type?: 'button' | 'submit' | 'reset';
};

export const InputGroupStepper: React.FC<TInputGroupStepperProps> = (props) => {
	const {
		onIncrement,
		onDecrement,
		incrementDisabled = false,
		decrementDisabled = false,
		incrementLabel = 'Increase value',
		decrementLabel = 'Decrease value',
		repeatDelayMs = 400,
		repeatIntervalMs = 80,
		className,
		...rest
	} = props;
	const { size } = React.useContext(InputGroupContext);

	const repeatTimeoutRef = React.useRef<number | null>(null);
	const repeatIntervalRef = React.useRef<number | null>(null);
	const activeDirectionRef = React.useRef<TInputGroupStepperDirection | null>(null);
	const suppressNextPointerClickRef = React.useRef(false);

	// MARK: - Actions

	const stopRepeating = React.useCallback(() => {
		window.clearTimeout(repeatTimeoutRef.current ?? undefined);
		window.clearInterval(repeatIntervalRef.current ?? undefined);
		repeatTimeoutRef.current = null;
		repeatIntervalRef.current = null;
		activeDirectionRef.current = null;
	}, []);

	const runStep = useStableCallback((direction: TInputGroupStepperDirection) => {
		if (direction === 'increment') {
			if (incrementDisabled) {
				stopRepeating();
				return;
			}
			onIncrement();
		} else {
			if (decrementDisabled) {
				stopRepeating();
				return;
			}
			onDecrement();
		}
	});

	const startRepeating = React.useCallback(
		(direction: TInputGroupStepperDirection, event: React.PointerEvent<HTMLButtonElement>) => {
			if (event.button !== 0) {
				return;
			}

			suppressNextPointerClickRef.current = true;
			event.currentTarget.setPointerCapture(event.pointerId);
			stopRepeating();
			activeDirectionRef.current = direction;
			runStep(direction);

			repeatTimeoutRef.current = window.setTimeout(() => {
				repeatIntervalRef.current = window.setInterval(() => {
					runStep(direction);
				}, repeatIntervalMs);
			}, repeatDelayMs);
		},
		[repeatDelayMs, repeatIntervalMs, runStep, stopRepeating]
	);

	const handleIncrementClick = React.useCallback(
		(event: React.MouseEvent<HTMLButtonElement>) => {
			if (suppressNextPointerClickRef.current && event.detail > 0) {
				suppressNextPointerClickRef.current = false;
				return;
			}
			suppressNextPointerClickRef.current = false;
			runStep('increment');
		},
		[runStep]
	);

	const handleDecrementClick = React.useCallback(
		(event: React.MouseEvent<HTMLButtonElement>) => {
			if (suppressNextPointerClickRef.current && event.detail > 0) {
				suppressNextPointerClickRef.current = false;
				return;
			}
			suppressNextPointerClickRef.current = false;
			runStep('decrement');
		},
		[runStep]
	);

	// MARK: - Effects

	React.useEffect(() => stopRepeating, [stopRepeating]);

	// MARK: - UI

	return (
		<div
			data-slot="input-group-stepper"
			data-size={size}
			className={cn(inputGroupStepperVariants({ size }), className)}
			{...rest}
		>
			<button
				type="button"
				data-slot="input-group-stepper-button"
				className={inputGroupStepperButtonVariants({ position: 'top' })}
				onPointerDown={(e) => startRepeating('increment', e)}
				onPointerUp={stopRepeating}
				onPointerCancel={stopRepeating}
				onLostPointerCapture={stopRepeating}
				onClick={handleIncrementClick}
				disabled={incrementDisabled}
				aria-label={incrementLabel}
			>
				<ChevronUpIcon aria-hidden className={inputGroupStepperIconVariants({ size })} />
			</button>
			<button
				type="button"
				data-slot="input-group-stepper-button"
				className={inputGroupStepperButtonVariants({ position: 'bottom' })}
				onPointerDown={(e) => startRepeating('decrement', e)}
				onPointerUp={stopRepeating}
				onPointerCancel={stopRepeating}
				onLostPointerCapture={stopRepeating}
				onClick={handleDecrementClick}
				disabled={decrementDisabled}
				aria-label={decrementLabel}
			>
				<ChevronDownIcon aria-hidden className={inputGroupStepperIconVariants({ size })} />
			</button>
		</div>
	);
};

export interface TInputGroupStepperProps extends React.ComponentProps<'div'> {
	onIncrement: () => void;
	onDecrement: () => void;
	incrementDisabled?: boolean;
	decrementDisabled?: boolean;
	incrementLabel?: string;
	decrementLabel?: string;
	repeatDelayMs?: number;
	repeatIntervalMs?: number;
}

type TInputGroupStepperDirection = 'increment' | 'decrement';

const inputGroupStepperVariants = cva(
	'border-base-200 bg-base-950/2 order-last flex flex-col self-stretch overflow-hidden rounded-r-lg border-l',
	{
		variants: {
			size: {
				sm: 'w-4',
				md: 'w-5'
			}
		},
		defaultVariants: {
			size: 'sm'
		}
	}
);

const inputGroupStepperButtonVariants = cva(
	'text-base-400 hover:bg-base-950/6 hover:text-base-950 focus-visible:ring-primary/30 flex min-h-0 w-full flex-1 items-center justify-center transition-colors outline-none focus-visible:ring-1 focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-30',
	{
		variants: {
			position: {
				top: 'border-base-200 rounded-tr-lg border-b',
				bottom: 'rounded-br-lg'
			}
		}
	}
);

const inputGroupStepperIconVariants = cva(
	// Note: The stepper has a border-l, so the visual center sits 1px right; nudge left to compensate
	'-translate-x-px',
	{
		variants: {
			size: {
				sm: 'size-3',
				md: 'size-3.5'
			}
		},
		defaultVariants: {
			size: 'sm'
		}
	}
);

export const InputGroupText: React.FC<TInputGroupTextProps> = (props) => {
	const { className, ...rest } = props;
	const { size } = React.useContext(InputGroupContext);

	return (
		<span
			data-slot="input-group-text"
			data-size={size}
			className={cn(inputGroupTextVariants({ size }), className)}
			{...rest}
		/>
	);
};

export type TInputGroupTextProps = React.ComponentProps<'span'>;

const inputGroupTextVariants = cva(
	'text-base-500 flex items-center [&_svg]:pointer-events-none [&_svg]:shrink-0',
	{
		variants: {
			size: {
				sm: "gap-1 text-sm [&_svg:not([class*='size-'])]:size-3.5",
				md: "gap-1.5 text-sm [&_svg:not([class*='size-'])]:size-4"
			}
		},
		defaultVariants: {
			size: 'sm'
		}
	}
);

export const InputGroupInput: React.FC<TInputGroupInputProps> = (props) => {
	const { className, ...rest } = props;
	const { size } = React.useContext(InputGroupContext);

	return (
		<Input
			data-slot="input-group-control"
			size={size}
			className={cn(
				'h-full min-w-0 flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0',
				'[[type=number]]:[appearance:textfield] [[type=number]]:text-right [&[type=number]::-webkit-inner-spin-button]:appearance-none [&[type=number]::-webkit-outer-spin-button]:appearance-none',
				className
			)}
			{...rest}
		/>
	);
};

export type TInputGroupInputProps = Omit<React.ComponentProps<typeof Input>, 'size'>;

export const InputGroupTextarea: React.FC<TInputGroupTextareaProps> = (props) => {
	const { className, ...rest } = props;
	const { size } = React.useContext(InputGroupContext);

	return (
		<Textarea
			data-slot="input-group-control"
			size={size}
			className={cn(
				'min-h-0 flex-1 resize-none rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0',
				className
			)}
			{...rest}
		/>
	);
};

export type TInputGroupTextareaProps = Omit<React.ComponentProps<typeof Textarea>, 'size'>;
