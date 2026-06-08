import React from 'react';
import { CommandPaletteCxProvider, CommandPaletteModal } from '@/modules/command-palette';
import { SettingsCxProvider } from '@/modules/settings';
import { ShortcutsCxProvider } from '@/modules/shortcuts';
import { UpdaterCxProvider } from '@/modules/updater';
import { ToastsCxProvider } from '../display';
import { AppRuntimeBridge } from './AppRuntimeBridge';
import { ThemeProvider } from './ThemeProvider';
import { TypographyProvider } from './TypographyProvider';

export const AppProvider: React.FC<TAppProviderProps> = (props) => {
	const { children } = props;

	return (
		<SettingsCxProvider>
			<ShortcutsCxProvider>
				<TypographyProvider>
					<ThemeProvider>
						<ToastsCxProvider>
							<UpdaterCxProvider>
								<CommandPaletteCxProvider>
									{children}
									<CommandPaletteModal />
									<AppRuntimeBridge />
								</CommandPaletteCxProvider>
							</UpdaterCxProvider>
						</ToastsCxProvider>
					</ThemeProvider>
				</TypographyProvider>
			</ShortcutsCxProvider>
		</SettingsCxProvider>
	);
};

export interface TAppProviderProps {
	children: React.ReactNode;
}
