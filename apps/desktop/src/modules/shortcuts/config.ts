import { specta } from '@/environment';

export const shortcutsConfig = {
	actions: {
		search: { label: 'Search' },
		toggleSidebar: { label: 'Toggle Sidebar' }
	} satisfies Record<specta.ShortcutAction, { label: string }>
} as const;
