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

			if (theme === 'auto') {
				await getCurrentWindow().setTheme(null);
				const effectiveTheme = await getCurrentWindow().theme();
				applyThemeClass(effectiveTheme ?? 'light');
				return;
			}

			await getCurrentWindow().setTheme(theme);
			applyThemeClass(theme);
		},
		[applyThemeClass]
	);

	// MARK: - Effects

	useSubscriber(
		settingsCx.$appSettings,
		({ value }) => {
			void applyTheme(value.appearance.theme);
		},
		[applyTheme]
	);

	// Listen for system theme changes (only matters if set to 'auto')
	React.useEffect(() => {
		const unlistenPromise = getCurrentWindow().onThemeChanged(({ payload }) => {
			const currentTheme = settingsCx.$appSettings._v.appearance.theme;
			if (currentTheme === 'auto') {
				applyThemeClass(payload);
			}
		});

		return () => {
			void unlistenPromise.then((unlisten) => unlisten());
		};
	}, [settingsCx, applyThemeClass]);

	// MARK: - UI

	return <>{children}</>;
};

interface TThemeProviderProps {
	children: React.ReactNode;
}
