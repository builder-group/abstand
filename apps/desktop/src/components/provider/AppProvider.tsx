import React from 'react';
import { ThemeProvider } from '@/components';
import { SettingsCxProvider } from '@/modules/settings';

export const AppProvider: React.FC<TAppProviderProps> = (props) => {
	const { children } = props;

	return (
		<SettingsCxProvider>
			<ThemeProvider>{children}</ThemeProvider>
		</SettingsCxProvider>
	);
};

interface TAppProviderProps {
	children: React.ReactNode;
}
