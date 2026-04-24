import { specta } from '@/environment';

export function formatShortcut(shortcut: specta.KeyboardShortcut): string {
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

	return CODE_DISPLAY[code] ?? code;
}

const MODIFIER_DISPLAY: Record<specta.ShortcutModifier, string> = {
	meta: '⌘',
	ctrl: '⌃',
	alt: '⌥',
	shift: '⇧'
};

const MODIFIER_ORDER: specta.ShortcutModifier[] = ['ctrl', 'alt', 'shift', 'meta'];

const CODE_DISPLAY: Record<string, string> = {
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
