import { createState } from 'feature-state';
import React from 'react';
import type { TResult } from 'tuple-result';
import { specta } from '@/environment';
import { createMountLifecycle } from '@/lib';
import { useSettingsCx, type SettingsCx } from '@/modules/settings';

export class ShortcutsCx {
	public readonly $configs = createState<TShortcutConfigs>({});

	private readonly settingsCx: SettingsCx;

	constructor(settingsCx: SettingsCx) {
		this.settingsCx = settingsCx;
	}

	public mount(): () => void {
		const lifecycle = createMountLifecycle();

		const onKeyDown = (e: KeyboardEvent) => {
			for (const config of Object.values(this.$configs._v)) {
				if (config.isGlobal) continue;
				if (config.shortcut == null) continue;
				if (!this.matchesShortcut(e, config.shortcut)) continue;
				e.preventDefault();
				void specta.events.shortcutTriggeredEvent.emit(config.action);
				break;
			}
		};
		window.addEventListener('keydown', onKeyDown);
		lifecycle.addCleanup(() => window.removeEventListener('keydown', onKeyDown));

		const refreshConfigs = async () => {
			const configs = await specta.commands.getShortcutConfigs();
			if (lifecycle.isUnmounted()) return;
			this.$configs.set(this.createShortcutConfigs(configs));
		};

		void (async () => {
			await refreshConfigs();

			lifecycle.addCleanup(
				await specta.events.appSettingsChangedEvent.listen(async () => {
					await refreshConfigs();
				})
			);
		})();

		return lifecycle.unmount;
	}

	public async updateShortcut(
		action: specta.ShortcutAction,
		shortcut: specta.KeyboardShortcut | null
	): Promise<TResult<null, string>> {
		return this.settingsCx.update({
			shortcuts: { ...this.settingsCx.$appSettings._v.shortcuts, [action]: shortcut }
		});
	}

	public async resetShortcut(action: specta.ShortcutAction): Promise<TResult<null, string>> {
		const { [action]: _, ...remainingShortcuts } = this.settingsCx.$appSettings._v.shortcuts;
		return this.settingsCx.update({ shortcuts: remainingShortcuts });
	}

	private matchesShortcut(e: KeyboardEvent, shortcut: specta.KeyboardShortcut): boolean {
		if (e.code !== shortcut.code) return false;
		if (e.metaKey !== shortcut.modifiers.includes('meta')) return false;
		if (e.ctrlKey !== shortcut.modifiers.includes('ctrl')) return false;
		if (e.altKey !== shortcut.modifiers.includes('alt')) return false;
		if (e.shiftKey !== shortcut.modifiers.includes('shift')) return false;
		return true;
	}

	private createShortcutConfigs(configs: specta.ShortcutActionConfigDto[]): TShortcutConfigs {
		const result: TShortcutConfigs = {};
		for (const config of configs) {
			result[config.action] = config;
		}
		return result;
	}
}

type TShortcutConfigs = Partial<Record<specta.ShortcutAction, specta.ShortcutActionConfigDto>>;

const ReactShortcutsCx = React.createContext<ShortcutsCx | null>(null);

export const ShortcutsCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const settingsCx = useSettingsCx();
	const cx = React.useMemo(() => new ShortcutsCx(settingsCx), [settingsCx]);

	React.useEffect(() => {
		return cx.mount();
	}, [cx]);

	return <ReactShortcutsCx.Provider value={cx}>{children}</ReactShortcutsCx.Provider>;
};

export function useShortcutsCx(): ShortcutsCx {
	const cx = React.useContext(ReactShortcutsCx);
	if (cx == null) {
		throw new Error('useShortcutsCx must be used within a ShortcutsCxProvider');
	}
	return cx;
}
