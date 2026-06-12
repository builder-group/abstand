import React from 'react';
import { CommandPaletteCxProvider, CommandPaletteModal } from '@/modules/command-palette';
import { ShortcutsCxProvider } from '@/modules/shortcuts';
import { UpdaterCxProvider } from '@/modules/updater';
import { AppRuntimeBridge } from './AppRuntimeBridge';

export const MainWindowProvider: React.FC<TMainWindowProviderProps> = (props) => {
	const { children } = props;

	return (
		<ShortcutsCxProvider>
			<UpdaterCxProvider>
				<CommandPaletteCxProvider>
					{children}
					<CommandPaletteModal />
					<AppRuntimeBridge />
				</CommandPaletteCxProvider>
			</UpdaterCxProvider>
		</ShortcutsCxProvider>
	);
};

export interface TMainWindowProviderProps {
	children: React.ReactNode;
}
