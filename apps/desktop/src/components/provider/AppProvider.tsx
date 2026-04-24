import React from 'react';
import { ThemeProvider } from '@/components';
import { SettingsCxProvider } from '@/modules/settings';
import { ShortcutsCxProvider } from '@/modules/shortcuts';

export const AppProvider: React.FC<TAppProviderProps> = (props) => {
	const { children } = props;

	return (
		<SettingsCxProvider>
			<ShortcutsCxProvider>
				<ThemeProvider>{children}</ThemeProvider>
			</ShortcutsCxProvider>
		</SettingsCxProvider>
	);
};

interface TAppProviderProps {
	children: React.ReactNode;
}
