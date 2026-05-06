import React from 'react';
import { ThemeProvider, TypographyProvider } from '@/components';
import { CommandPaletteCxProvider, CommandPaletteModal } from '@/modules/command-palette';
import { SettingsCxProvider } from '@/modules/settings';
import { ShortcutsCxProvider } from '@/modules/shortcuts';

export const AppProvider: React.FC<TAppProviderProps> = (props) => {
	const { children } = props;

	return (
		<SettingsCxProvider>
			<ShortcutsCxProvider>
				<CommandPaletteCxProvider>
					<TypographyProvider>
						<ThemeProvider>{children}</ThemeProvider>
					</TypographyProvider>
					<CommandPaletteModal />
				</CommandPaletteCxProvider>
			</ShortcutsCxProvider>
		</SettingsCxProvider>
	);
};

export interface TAppProviderProps {
	children: React.ReactNode;
}
