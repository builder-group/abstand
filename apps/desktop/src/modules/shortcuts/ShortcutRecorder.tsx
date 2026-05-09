import { cva } from 'class-variance-authority';
import React from 'react';
import { Button, XCircleIcon } from '@/components';
import { specta } from '@/environment';
import { formatShortcut } from './format';

export const ShortcutRecorder: React.FC<TShortcutRecorderProps> = (props) => {
	const { value, onChange } = props;
	const [recording, setRecording] = React.useState(false);
	const buttonRef = React.useRef<HTMLButtonElement | null>(null);

	const isEmpty = value == null;
	const state = recording ? 'recording' : isEmpty ? 'empty' : 'idle';
	const label = recording
		? 'Press Shortcut'
		: value == null
			? 'Record Shortcut'
			: formatShortcut(value);

	// MARK: - Actions

	const handleStartRecording = React.useCallback(() => {
		setRecording(true);
	}, []);

	const handleStopRecording = React.useCallback(() => {
		setRecording(false);
	}, []);

	const handleClear = React.useCallback(
		(event: React.MouseEvent<HTMLButtonElement>) => {
			event.stopPropagation();
			onChange(null);
		},
		[onChange]
	);

	const handleRecorderKeyDown = React.useCallback(
		(event: React.KeyboardEvent<HTMLButtonElement>) => {
			if (!recording) {
				return;
			}

			event.preventDefault();
			event.stopPropagation();

			if (event.code === 'Escape') {
				handleStopRecording();
				return;
			}

			if (modifierKeys.has(event.key)) {
				return;
			}

			const modifiers: specta.ShortcutModifier[] = [];
			if (event.metaKey) modifiers.push('meta');
			if (event.ctrlKey) modifiers.push('ctrl');
			if (event.altKey) modifiers.push('alt');
			if (event.shiftKey) modifiers.push('shift');

			onChange({ modifiers, code: event.code });
			handleStopRecording();
		},
		[handleStopRecording, onChange, recording]
	);

	// MARK: - Effects

	React.useEffect(() => {
		if (!recording) {
			return;
		}

		buttonRef.current?.focus();

		const handleFocusIn = () => {
			if (document.activeElement !== buttonRef.current) {
				handleStopRecording();
			}
		};

		const handleWindowBlur = () => {
			handleStopRecording();
		};

		window.addEventListener('focusin', handleFocusIn, true);
		window.addEventListener('blur', handleWindowBlur);

		return () => {
			window.removeEventListener('focusin', handleFocusIn, true);
			window.removeEventListener('blur', handleWindowBlur);
		};
	}, [handleStopRecording, recording]);

	// MARK: - UI

	return (
		<div className={shortcutRecorderVariants({ state })}>
			<button
				ref={buttonRef}
				type="button"
				// Note: Works around WebKit/macOS dropping focus on pressed buttons when tabIndex is implicit (WebKit #229895)
				tabIndex={0}
				onBlur={recording ? handleStopRecording : undefined}
				onClick={recording ? undefined : handleStartRecording}
				onKeyDown={handleRecorderKeyDown}
				className={mainButtonVariants({ state })}
				aria-label={recording ? 'Recording shortcut' : 'Record shortcut'}
			>
				<span className="truncate">{label}</span>
			</button>
			{!recording && !isEmpty ? (
				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					onClick={handleClear}
					className="text-base-300 hover:text-base-500 focus-visible:text-base-500 mr-1 shadow-none"
					aria-label="Clear shortcut"
				>
					<XCircleIcon />
				</Button>
			) : null}
		</div>
	);
};

interface TShortcutRecorderProps {
	value: specta.KeyboardShortcut | null;
	onChange: (shortcut: specta.KeyboardShortcut | null) => void;
}

const modifierKeys = new Set(['Meta', 'Control', 'Alt', 'Shift']);

const shortcutRecorderVariants = cva(
	'border-base-200 bg-base-0 text-base-950 inline-flex h-7 min-w-32 shrink-0 items-center rounded-lg border bg-clip-padding text-sm transition disabled:pointer-events-none disabled:opacity-50',
	{
		variants: {
			state: {
				idle: 'focus-within:border-primary focus-within:ring-primary/30 focus-within:ring-2',
				empty: 'focus-within:border-primary focus-within:ring-primary/30 focus-within:ring-2',
				recording: 'border-primary text-primary ring-primary/30 ring-2'
			}
		},
		defaultVariants: {
			state: 'idle'
		}
	}
);

const mainButtonVariants = cva(
	'flex min-w-0 flex-1 items-center rounded-[inherit] px-2 text-left outline-none',
	{
		variants: {
			state: {
				idle: 'text-base-950',
				empty: 'text-base-400 hover:text-base-600',
				recording: 'cursor-default'
			}
		},
		defaultVariants: {
			state: 'idle'
		}
	}
);
