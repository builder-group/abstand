import { createState } from 'feature-state';
import React from 'react';
import { specta } from '@/environment';
import { createMountLifecycle } from '@/lib';
import { useSettingsCx, type SettingsCx } from '@/modules/settings';
import type { FileRouteTypes } from '@/routeTree.gen';

export class CommandPaletteCx {
	public readonly $isOpen = createState(false);
	public readonly $query = createState('');
	public readonly $items = createState<TCommandItem[]>([]);

	private readonly settingsCx: SettingsCx;

	public constructor(settingsCx: SettingsCx) {
		this.settingsCx = settingsCx;
	}

	public mount(): () => void {
		const lifecycle = createMountLifecycle();

		// Fires immediately with current value, then on every settings change
		lifecycle.addCleanup(
			this.settingsCx.$appSettings.subscribe(() => {
				this.$items.set(this.buildItems());
			})
		);

		void (async () => {
			lifecycle.addCleanup(
				await specta.events.shortcutTriggeredEvent.listen((event) => {
					if (event.payload === 'search') this.open();
				})
			);
		})();

		return lifecycle.unmount;
	}

	public open(): void {
		this.$isOpen.set(true);
	}

	public close(): void {
		this.$isOpen.set(false);
		this.$query.set('');
	}

	public filter(query: string, items = this.$items._v): TCommandItem[] {
		const q = query.toLowerCase().trim();
		if (q === '') return [...items];
		return items.filter(
			(item) =>
				item.label.toLowerCase().includes(q) ||
				item.group.toLowerCase().includes(q) ||
				item.keywords.some((k) => k.includes(q))
		);
	}

	private buildItems(): TCommandItem[] {
		const { developer } = this.settingsCx.$appSettings._v;
		const items: TCommandItem[] = [
			{
				id: 'today',
				label: 'Today',
				group: 'Navigation',
				keywords: ['home', 'today'],
				to: '/window/main/today'
			},
			{
				id: 'new-intention',
				label: 'New Intention',
				group: 'Navigation',
				keywords: ['new', 'intention', 'create', 'plan'],
				to: '/window/main/intentions/new'
			},
			{
				id: 'settings-general',
				label: 'General',
				group: 'Settings',
				keywords: ['general', 'appearance', 'theme'],
				to: '/window/main/settings/general'
			},
			{
				id: 'settings-shortcuts',
				label: 'Shortcuts',
				group: 'Settings',
				keywords: ['shortcuts', 'keyboard', 'keybindings', 'hotkeys'],
				to: '/window/main/settings/shortcuts'
			}
		];

		if (developer.enabled) {
			items.push({
				id: 'settings-developer',
				label: 'Developer',
				group: 'Settings',
				keywords: ['developer', 'debug', 'dev'],
				to: '/window/main/settings/developer'
			});
		}

		return items;
	}
}

const ReactCommandPaletteCx = React.createContext<CommandPaletteCx | null>(null);

export const CommandPaletteCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const settingsCx = useSettingsCx();
	const cx = React.useMemo(() => new CommandPaletteCx(settingsCx), [settingsCx]);

	React.useEffect(() => {
		return cx.mount();
	}, [cx]);

	return <ReactCommandPaletteCx.Provider value={cx}>{children}</ReactCommandPaletteCx.Provider>;
};

export function useCommandPaletteCx(): CommandPaletteCx {
	const cx = React.useContext(ReactCommandPaletteCx);
	if (cx == null) {
		throw new Error('useCommandPaletteCx must be used within a CommandPaletteCxProvider');
	}
	return cx;
}

export interface TCommandItem {
	id: string;
	label: string;
	group: string;
	keywords: string[];
	to: FileRouteTypes['to'];
}
