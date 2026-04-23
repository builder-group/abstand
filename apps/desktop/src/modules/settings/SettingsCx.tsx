import { createState } from 'feature-state';
import React from 'react';
import type { TResult } from 'tuple-result';
import { specta } from '@/environment';
import { createMountLifecycle, toTuple } from '@/lib';

export class SettingsCx {
	public readonly $appSettings = createState<specta.AppSettings>({
		version: '0.0.1',
		appearance: {
			theme: 'auto'
		},
		developer: {
			enabled: false
		}
	} satisfies specta.AppSettings);

	public mount(): () => void {
		const lifecycle = createMountLifecycle();

		void (async () => {
			const appSettings = await specta.commands.getSettings();
			if (lifecycle.isUnmounted()) return;
			this.$appSettings.set(appSettings);

			lifecycle.addCleanup(
				await specta.events.appSettingsChangedEvent.listen((event) => {
					this.$appSettings.set(event.payload);
				})
			);
		})();

		return lifecycle.unmount;
	}

	public async update(updates: Partial<specta.AppSettings>): Promise<TResult<null, string>> {
		const currentSettings = this.$appSettings.get();
		const nextSettings: specta.AppSettings = {
			...currentSettings,
			...updates,
			appearance: {
				...currentSettings.appearance,
				...updates.appearance
			},
			developer: {
				...currentSettings.developer,
				...updates.developer
			}
		};
		// Note: Successful writes sync back through appSettingsChangedEvent
		return toTuple(await specta.commands.setSettings(nextSettings));
	}

	public async reset(): Promise<TResult<specta.AppSettings, string>> {
		// Note: Successful writes sync back through appSettingsChangedEvent
		return toTuple(await specta.commands.resetSettings());
	}
}

const ReactSettingsCx = React.createContext<SettingsCx | null>(null);

export const SettingsCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const cx = React.useMemo(() => new SettingsCx(), []);

	React.useEffect(() => {
		return cx.mount();
	}, [cx]);

	return <ReactSettingsCx.Provider value={cx}>{children}</ReactSettingsCx.Provider>;
};

export function useSettingsCx(): SettingsCx {
	const cx = React.useContext(ReactSettingsCx);
	if (cx == null) {
		throw new Error('useSettingsCx must be used within a SettingsCxProvider');
	}
	return cx;
}
