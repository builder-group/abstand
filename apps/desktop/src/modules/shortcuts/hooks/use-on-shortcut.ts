import { specta } from '@/environment';
import { useOnShortcutTriggered } from './use-on-shortcut-triggered';

export function useOnShortcut(action: specta.ShortcutAction, callback: () => void): void {
	useOnShortcutTriggered((triggered) => {
		if (triggered === action) callback();
	});
}
