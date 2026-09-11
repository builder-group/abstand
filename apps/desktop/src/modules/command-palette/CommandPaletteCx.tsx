import { getCurrentWindow } from '@tauri-apps/api/window';
import { createState } from 'feature-state';
import React from 'react';
import { specta, supportLinks } from '@/environment';
import { createMountLifecycle, openExternalUrl } from '@/lib';
import { formatIntentionBehavior, useIntentionsCx, type IntentionsCx } from '@/modules/intentions';
import { useSettingsCx, type SettingsCx } from '@/modules/settings';
import type { FileRouteTypes } from '@/routeTree.gen';

export class CommandPaletteCx {
	public readonly $isOpen = createState(false);
	public readonly $query = createState('');
	public readonly $items = createState<TCommandItem[]>([]);

	private readonly settingsCx: SettingsCx;

	private readonly intentionsCx: IntentionsCx;
	private readonly intentionItemCleanups = new Map<number, () => void>();

	constructor(settingsCx: SettingsCx, intentionsCx: IntentionsCx) {
		this.settingsCx = settingsCx;
		this.intentionsCx = intentionsCx;
	}

	public mount(): () => void {
		const lifecycle = createMountLifecycle();
		const rebuildItems = () => {
			this.$items.set(this.buildItems());
		};

		lifecycle.addCleanup(
			this.settingsCx.$appSettings.subscribe(() => {
				rebuildItems();
			})
		);

		lifecycle.addCleanup(
			this.intentionsCx.$intentionIds.subscribe(({ value: intentionIds }) => {
				this.syncIntentionItemSubscriptions(intentionIds, rebuildItems);
				rebuildItems();
			})
		);
		lifecycle.addCleanup(() => this.clearIntentionItemSubscriptions());

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
		const { activity, automation, developer } = this.settingsCx.$appSettings._v;
		const items: TCommandItem[] = [
			{
				type: 'navigation',
				id: 'today',
				label: 'Today',
				group: 'Navigation',
				keywords: ['home', 'today'],
				to: '/window/main/today'
			},
			{
				type: 'navigation',
				id: 'new-intention',
				label: 'New Intention',
				group: 'Navigation',
				keywords: ['new', 'intention', 'create', 'plan'],
				to: '/window/main/intentions/new'
			},
			{
				type: 'navigation',
				id: 'new-block-intention',
				label: 'New Block Intention',
				group: 'Navigation',
				keywords: ['new', 'block', 'intention', 'create', 'plan'],
				to: '/window/main/intentions/new/block'
			},
			...this.buildIntentionItems(),
			{
				type: 'action',
				id: 'toggle-theme',
				label: 'Toggle theme',
				group: 'Appearance',
				keywords: ['theme', 'appearance', 'light', 'dark', 'toggle'],
				run: () => this.toggleTheme()
			},
			{
				type: 'navigation',
				id: 'settings-general',
				label: 'General',
				group: 'Settings',
				keywords: ['general', 'appearance', 'theme'],
				to: '/window/main/settings/general'
			},
			{
				type: 'navigation',
				id: 'settings-shortcuts',
				label: 'Shortcuts',
				group: 'Settings',
				keywords: ['shortcuts', 'keyboard', 'keybindings', 'hotkeys'],
				to: '/window/main/settings/shortcuts'
			},
			...((activity.enabled
				? [
						{
							type: 'navigation',
							id: 'settings-activity',
							label: 'Activity',
							group: 'Settings',
							keywords: ['activity', 'tracking', 'recording', 'flow map'],
							to: '/window/main/settings/activity'
						}
					]
				: []) satisfies TCommandItem[]),
			...((automation.enabled
				? [
						{
							type: 'navigation',
							id: 'settings-automation',
							label: 'Automation',
							group: 'Settings',
							keywords: ['automation', 'command', 'cli', 'scripts', 'agents'],
							to: '/window/main/settings/automation'
						}
					]
				: []) satisfies TCommandItem[]),
			...((developer.enabled
				? [
						{
							type: 'navigation',
							id: 'settings-developer',
							label: 'Developer',
							group: 'Settings',
							keywords: ['developer', 'debug', 'dev'],
							to: '/window/main/settings/developer'
						},
						{
							type: 'navigation',
							id: 'settings-developer-ui-playground',
							label: 'UI Playground',
							group: 'Developer',
							keywords: ['developer', 'debug', 'dev', 'ui', 'playground'],
							to: '/window/main/settings/developer/ui-playground'
						}
					]
				: []) satisfies TCommandItem[]),
			...this.buildSupportItems()
		];

		return items;
	}

	private buildIntentionItems(): TCommandItem[] {
		return this.intentionsCx.$intentionIds
			.get()
			.map((intentionId) => this.intentionsCx.getIntention(intentionId))
			.filter((intention) => intention != null)
			.map((intention) => {
				const behavior = formatIntentionBehavior(intention);

				return {
					type: 'navigation',
					id: `intention-${intention.id}`,
					label: intention.name,
					group: 'Intentions',
					keywords: ['intention', intention.behavior.type, behavior.toLowerCase()],
					to: '/window/main/intentions/$intentionId',
					params: { intentionId: intention.id }
				};
			});
	}

	private buildSupportItems(): TCommandItem[] {
		return supportLinks.map((link) => ({
			type: 'action',
			id: `support-${link.id}`,
			label: link.label,
			group: 'Help & Feedback',
			keywords: ['help', 'feedback', 'support', ...link.keywords],
			run: () => openExternalUrl(link.url)
		}));
	}

	private async toggleTheme(): Promise<void> {
		const currentTheme = this.settingsCx.$appSettings._v.appearance.theme;

		if (currentTheme === 'light') {
			await this.settingsCx.update({ appearance: { theme: 'dark' } });
			return;
		}

		if (currentTheme === 'dark') {
			await this.settingsCx.update({ appearance: { theme: 'light' } });
			return;
		}

		const effectiveTheme = await getCurrentWindow().theme();
		const nextTheme: specta.Theme = effectiveTheme === 'dark' ? 'light' : 'dark';
		await this.settingsCx.update({ appearance: { theme: nextTheme } });
	}

	private syncIntentionItemSubscriptions(intentionIds: number[], onChange: () => void): void {
		const intentionIdSet = new Set(intentionIds);

		for (const [intentionId, cleanup] of this.intentionItemCleanups) {
			if (!intentionIdSet.has(intentionId)) {
				cleanup();
				this.intentionItemCleanups.delete(intentionId);
			}
		}

		for (const intentionId of intentionIds) {
			if (!this.intentionItemCleanups.has(intentionId)) {
				const cleanup = this.intentionsCx.getIntentionState(intentionId).subscribe(onChange);
				this.intentionItemCleanups.set(intentionId, cleanup);
			}
		}
	}

	private clearIntentionItemSubscriptions(): void {
		for (const cleanup of this.intentionItemCleanups.values()) {
			cleanup();
		}
		this.intentionItemCleanups.clear();
	}
}

// MARK: - React Context

const ReactCommandPaletteContext = React.createContext<CommandPaletteCx | null>(null);

export const CommandPaletteCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const settingsCx = useSettingsCx();
	const intentionsCx = useIntentionsCx();
	const cx = React.useMemo(
		() => new CommandPaletteCx(settingsCx, intentionsCx),
		[settingsCx, intentionsCx]
	);

	React.useEffect(() => {
		return cx.mount();
	}, [cx]);

	return <ReactCommandPaletteContext value={cx}>{children}</ReactCommandPaletteContext>;
};

export function useCommandPaletteCx(): CommandPaletteCx {
	const cx = React.use(ReactCommandPaletteContext);
	if (cx == null) {
		throw new Error('useCommandPaletteCx must be used within a CommandPaletteCxProvider');
	}
	return cx;
}

export type TCommandItem = TNavigationCommandItem | TActionCommandItem;

interface TNavigationCommandItem extends TBaseCommandItem {
	type: 'navigation';
	to: FileRouteTypes['to'];
	params?: Record<string, unknown>;
}

interface TActionCommandItem extends TBaseCommandItem {
	type: 'action';
	run: () => Promise<void>;
}

interface TBaseCommandItem {
	id: string;
	label: string;
	group: string;
	keywords: string[];
}
