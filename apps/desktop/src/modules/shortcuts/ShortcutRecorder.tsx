import { cva } from 'class-variance-authority';
import React from 'react';
import { XCircleIcon } from '@/components';
import { specta } from '@/environment';

export const ShortcutRecorder: React.FC<TShortcutRecorderProps> = (props) => {
	const { value, onChange } = props;
	const [recording, setRecording] = React.useState(false);
	const buttonRef = React.useRef<HTMLButtonElement | null>(null);

	const isEmpty = value.code === '';
	const state = recording ? 'recording' : isEmpty ? 'empty' : 'idle';
	const label = recording ? 'Press Shortcut' : isEmpty ? 'Record Shortcut' : formatShortcut(value);

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
			onChange(createEmptyShortcut(value.global));
		},
		[onChange, value.global]
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

			if (MODIFIER_KEYS.has(event.key)) {
				return;
			}

			const modifiers: specta.ShortcutModifier[] = [];
			if (event.metaKey) {
				modifiers.push('meta');
			}
			if (event.ctrlKey) {
				modifiers.push('ctrl');
			}
			if (event.altKey) {
				modifiers.push('alt');
			}
			if (event.shiftKey) {
				modifiers.push('shift');
			}

			onChange({
				...value,
				modifiers,
				code: event.code
			});
			handleStopRecording();
		},
		[handleStopRecording, onChange, recording, value]
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
				onBlur={recording ? handleStopRecording : undefined}
				onClick={recording ? undefined : handleStartRecording}
				onKeyDown={handleRecorderKeyDown}
				className={mainButtonVariants({ state })}
				aria-label={recording ? 'Recording shortcut' : 'Record shortcut'}
			>
				<span className="truncate">{label}</span>
			</button>
			{!recording && !isEmpty ? (
				<button
					type="button"
					onClick={handleClear}
					className={clearButtonVariants()}
					aria-label="Clear shortcut"
				>
					<XCircleIcon className="size-3.5" />
				</button>
			) : null}
		</div>
	);
};

interface TShortcutRecorderProps {
	value: specta.KeyboardShortcut;
	onChange: (shortcut: specta.KeyboardShortcut) => void;
}

const MODIFIER_DISPLAY: Record<specta.ShortcutModifier, string> = {
	meta: '⌘',
	ctrl: '⌃',
	alt: '⌥',
	shift: '⇧'
};

const MODIFIER_ORDER: specta.ShortcutModifier[] = ['ctrl', 'alt', 'shift', 'meta'];
const MODIFIER_KEYS = new Set(['Meta', 'Control', 'Alt', 'Shift']);

const shortcutRecorderVariants = cva(
	'border-base-200 bg-base-0 text-base-950 inline-flex h-8 min-w-32 shrink-0 items-center rounded-lg border bg-clip-padding text-sm transition disabled:pointer-events-none disabled:opacity-50',
	{
		variants: {
			state: {
				idle: 'focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30',
				empty: 'focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30',
				recording: 'border-primary text-primary ring-2 ring-primary/30'
			}
		},
		defaultVariants: {
			state: 'idle'
		}
	}
);

const mainButtonVariants = cva(
	'flex min-w-0 flex-1 items-center rounded-[inherit] px-2.5 text-left outline-none',
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

const clearButtonVariants = cva(
	'text-base-300 mr-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full outline-none transition hover:text-base-500 focus-visible:text-base-500'
);

function createEmptyShortcut(global: boolean): specta.KeyboardShortcut {
	return {
		modifiers: [],
		code: '',
		global
	};
}

function formatShortcut(shortcut: specta.KeyboardShortcut): string {
	const modifiers = MODIFIER_ORDER.filter((modifier) => shortcut.modifiers.includes(modifier))
		.map((modifier) => MODIFIER_DISPLAY[modifier])
		.join('');

	return modifiers + codeToLabel(shortcut.code);
}

function codeToLabel(code: string): string {
	if (code.startsWith('Key')) {
		return code.slice(3);
	}

	if (code.startsWith('Digit')) {
		return code.slice(5);
	}

	if (code.startsWith('F') && !isNaN(Number(code.slice(1)))) {
		return code;
	}

	const map: Record<string, string> = {
		Space: '␣',
		Comma: ',',
		Period: '.',
		Slash: '/',
		Backslash: '\\',
		Semicolon: ';',
		Quote: "'",
		BracketLeft: '[',
		BracketRight: ']',
		Minus: '-',
		Equal: '=',
		Backquote: '`',
		ArrowUp: '↑',
		ArrowDown: '↓',
		ArrowLeft: '←',
		ArrowRight: '→',
		Tab: '⇥',
		Delete: '⌫',
		Enter: '↩'
	};

	return map[code] ?? code;
}
