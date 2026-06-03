import React from 'react';
import { CommandPaletteCxProvider, CommandPaletteModal } from '@/modules/command-palette';
import { SettingsCxProvider } from '@/modules/settings';
import { ShortcutsCxProvider } from '@/modules/shortcuts';
import { ToastsCxProvider } from '../display';
import { AppEventToasts } from './AppEventToasts';
import { ThemeProvider } from './ThemeProvider';
import { TypographyProvider } from './TypographyProvider';

export const AppProvider: React.FC<TAppProviderProps> = (props) => {
	const { children } = props;

	return (
		<SettingsCxProvider>
			<ShortcutsCxProvider>
				<CommandPaletteCxProvider>
					<TypographyProvider>
						<ThemeProvider>
							<ToastsCxProvider>
								<AppEventToasts />
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
