import React from 'react';
import { ThemeProvider, ToastsCxProvider, TypographyProvider } from '@/components';
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
						<ThemeProvider>
							<ToastsCxProvider>
								{children}
								<CommandPaletteModal />
							</ToastsCxProvider>
						</ThemeProvider>
					</TypographyProvider>
				</CommandPaletteCxProvider>
			</ShortcutsCxProvider>
		</SettingsCxProvider>
	);
};

export interface TAppProviderProps {
	children: React.ReactNode;
}
