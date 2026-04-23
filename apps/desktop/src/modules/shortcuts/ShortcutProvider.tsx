import { useSubscriber } from 'feature-react/state';
import React from 'react';
import { specta } from '@/environment';
import { useSettingsCx } from '@/modules/settings';

export const ShortcutProvider: React.FC<{ children: React.ReactNode }> = (props) => {
	const { children } = props;
	const settingsCx = useSettingsCx();
	const shortcutsRef = React.useRef(settingsCx.$appSettings.get().shortcuts);

	useSubscriber(
		settingsCx.$appSettings,
		({ value }) => {
			shortcutsRef.current = value.shortcuts;
		},
		[]
	);

	React.useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			for (const [action, shortcut] of Object.entries(shortcutsRef.current) as [
				specta.ShortcutAction,
				specta.KeyboardShortcut
			][]) {
				if (shortcut.global) continue;
				if (!matchesShortcut(e, shortcut)) continue;
				e.preventDefault();
				void specta.events.shortcutTriggeredEvent.emit(action);
				break;
			}
		};

		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, []);

	return <>{children}</>;
};

function matchesShortcut(e: KeyboardEvent, shortcut: specta.KeyboardShortcut): boolean {
	if (e.code !== shortcut.code) return false;
	if (e.metaKey !== shortcut.modifiers.includes('meta')) return false;
	if (e.ctrlKey !== shortcut.modifiers.includes('ctrl')) return false;
	if (e.altKey !== shortcut.modifiers.includes('alt')) return false;
	if (e.shiftKey !== shortcut.modifiers.includes('shift')) return false;
	return true;
}
