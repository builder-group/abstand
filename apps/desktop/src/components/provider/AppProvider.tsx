import React from 'react';
import { ThemeProvider } from '@/components';
import { CommandPaletteCxProvider, CommandPaletteModal } from '@/modules/command-palette';
import { SettingsCxProvider } from '@/modules/settings';
import { ShortcutsCxProvider } from '@/modules/shortcuts';

export const AppProvider: React.FC<TAppProviderProps> = (props) => {
	const { children } = props;

	return (
		<SettingsCxProvider>
			<ShortcutsCxProvider>
				<CommandPaletteCxProvider>
					<ThemeProvider>{children}</ThemeProvider>
					<CommandPaletteModal />
				</CommandPaletteCxProvider>
			</ShortcutsCxProvider>
		</SettingsCxProvider>
	);
};

interface TAppProviderProps {
	children: React.ReactNode;
}
