import { specta } from '@/environment';

export function formatShortcut(shortcut: specta.KeyboardShortcut): string {
	const modifiers = modifierOrder
		.filter((modifier) => shortcut.modifiers.includes(modifier))
		.map((modifier) => modifierDisplay[modifier])
		.join('');

	return modifiers + codeToLabel(shortcut.code);
}

const modifierDisplay = {
	meta: '⌘',
	ctrl: '⌃',
	alt: '⌥',
	shift: '⇧'
} satisfies Record<specta.ShortcutModifier, string>;

const modifierOrder = ['ctrl', 'alt', 'shift', 'meta'] satisfies specta.ShortcutModifier[];

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

	return codeDisplay[code] ?? code;
}

const codeDisplay: Record<string, string> = {
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
