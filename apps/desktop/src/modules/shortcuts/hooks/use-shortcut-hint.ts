import { useCompute } from 'feature-react/state';
import { specta } from '@/environment';
import { formatShortcut } from '../format';
import { useShortcutsCx } from '../ShortcutsCx';

export function useShortcutHint(action: specta.ShortcutAction): string | undefined {
	const shortcutsCx = useShortcutsCx();
	return useCompute(shortcutsCx.$configs, ({ value }) => {
		const config = value.find((c) => c.action === action);
		if (config?.shortcut == null) return undefined;
		return formatShortcut(config.shortcut);
	});
}
