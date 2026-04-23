import React from 'react';
import { ThemeProvider } from '@/components';
import { SettingsCxProvider } from '@/modules/settings';
import { ShortcutProvider } from '@/modules/shortcuts';

export const AppProvider: React.FC<TAppProviderProps> = (props) => {
	const { children } = props;

	return (
		<SettingsCxProvider>
			<ShortcutProvider>
				<ThemeProvider>{children}</ThemeProvider>
			</ShortcutProvider>
		</SettingsCxProvider>
	);
};

interface TAppProviderProps {
	children: React.ReactNode;
}
