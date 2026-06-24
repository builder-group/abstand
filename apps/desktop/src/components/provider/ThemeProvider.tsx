import { getCurrentWindow, type Theme as TWindowTheme } from '@tauri-apps/api/window';
import { useSubscriber } from 'feature-react/state';
import React from 'react';
import { specta } from '@/environment';
import { useSettingsCx } from '@/modules/settings';

export const ThemeProvider: React.FC<TThemeProviderProps> = (props) => {
	const { children } = props;
	const settingsCx = useSettingsCx();

	// MARK: - Actions

	const applyThemeClass = React.useCallback((theme: TWindowTheme) => {
		document.documentElement.classList.toggle('dark', theme === 'dark');
	}, []);

	const applyTheme = React.useCallback(
		async (theme: specta.Theme) => {
			// For index.html to apply theme before CSS loads (prevents flash)
			localStorage.setItem('theme', theme);

			const currentWindow = getCurrentWindow();

			if (theme === 'auto') {
				await currentWindow.setTheme(null);
				const effectiveTheme = await currentWindow.theme();
				applyThemeClass(effectiveTheme ?? 'light');
				return;
			}

			await currentWindow.setTheme(theme);
			applyThemeClass(theme);
		},
		[applyThemeClass]
	);

	// MARK: - Effects

	useSubscriber(settingsCx.$appSettings, ({ value, prevValue }) => {
		if (value.appearance.theme !== prevValue?.appearance.theme) {
			void applyTheme(value.appearance.theme);
		}
	});

	// Listen for system theme changes (only matters if set to 'auto')
	React.useEffect(() => {
		const currentWindow = getCurrentWindow();

		const unlistenPromise = currentWindow.onThemeChanged(() => {
			const currentTheme = settingsCx.$appSettings._v.appearance.theme;
			if (currentTheme === 'auto') {
				applyTheme('auto');
			}
		});

		return () => {
			void unlistenPromise.then((unlisten) => unlisten());
		};
	}, [settingsCx, applyTheme]);

	// MARK: - UI

	return <>{children}</>;
};

export interface TThemeProviderProps {
	children: React.ReactNode;
}
