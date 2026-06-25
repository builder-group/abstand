import { createState } from 'feature-state';
import React from 'react';
import type { TResult } from 'tuple-result';
import { specta } from '@/environment';
import { createMountLifecycle, toTuple } from '@/lib';

export class SettingsCx {
	public readonly $appSettings = createState<specta.AppSettings>({
		version: '0.0.3',
		activity: {
			enabled: false,
			foreground: {
				trackApps: false,
				trackWindows: false,
				trackBrowser: false,
				trackPrivateBrowser: false
			}
		},
		appearance: {
			theme: 'auto',
			fontScale: 1
		},
		developer: {
			enabled: false
		},
		onboarding: {
			completedAt: null
		},
		updates: {
			automaticallyCheck: true,
			releaseChannel: 'stable'
		},
		shortcuts: {}
	} satisfies specta.AppSettings);

	public readonly $hasLoaded = createState(false);

	public mount(): () => void {
		const lifecycle = createMountLifecycle();

		void (async () => {
			const appSettings = await specta.commands.getSettings();
			if (lifecycle.isUnmounted()) return;
			this.$appSettings.set(appSettings);
			this.$hasLoaded.set(true);

			lifecycle.addCleanup(
				await specta.events.appSettingsChangedEvent.listen((event) => {
					this.$appSettings.set(event.payload);
				})
			);
		})();

		return lifecycle.unmount;
	}

	public async update(changes: TSettingsUpdates): Promise<TResult<null, string>> {
		const currentSettings = this.$appSettings.get();
		const nextSettings: specta.AppSettings = {
			...currentSettings,
			...changes,
			activity: {
				...currentSettings.activity,
				...changes.activity,
				foreground: {
					...currentSettings.activity.foreground,
					...changes.activity?.foreground
				}
			},
			appearance: {
				...currentSettings.appearance,
				...changes.appearance
			},
			developer: {
				...currentSettings.developer,
				...changes.developer
			},
			onboarding: {
				...currentSettings.onboarding,
				...changes.onboarding
			},
			updates: {
				...currentSettings.updates,
				...changes.updates
			},
			shortcuts: {
				...currentSettings.shortcuts,
				...changes.shortcuts
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

type TSettingsUpdates = Partial<
	Omit<
		specta.AppSettings,
		'activity' | 'appearance' | 'developer' | 'onboarding' | 'updates' | 'shortcuts'
	>
> & {
	activity?: Partial<Omit<specta.ActivitySettings, 'foreground'>> & {
		foreground?: Partial<specta.ActivityForegroundSettings>;
	};
	appearance?: Partial<specta.AppearanceSettings>;
	developer?: Partial<specta.DeveloperSettings>;
	onboarding?: Partial<specta.OnboardingSettings>;
	updates?: Partial<specta.UpdateSettings>;
	shortcuts?: specta.AppSettings['shortcuts'];
};

// MARK: - React Context

const ReactSettingsContext = React.createContext<SettingsCx | null>(null);

export const SettingsCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const cx = React.useMemo(() => new SettingsCx(), []);

	React.useEffect(() => {
		return cx.mount();
	}, [cx]);

	return <ReactSettingsContext value={cx}>{children}</ReactSettingsContext>;
};

export function useSettingsCx(): SettingsCx {
	const cx = React.use(ReactSettingsContext);
	if (cx == null) {
		throw new Error('useSettingsCx must be used within a SettingsCxProvider');
	}
	return cx;
}
