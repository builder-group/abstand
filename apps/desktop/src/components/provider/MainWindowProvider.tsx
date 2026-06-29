import React from 'react';
import { ShortcutsCxProvider } from '@/modules/shortcuts';
import { UpdaterCxProvider } from '@/modules/updater';
import { AppRuntimeBridge } from './AppRuntimeBridge';

export const MainWindowProvider: React.FC<TMainWindowProviderProps> = (props) => {
	const { children } = props;

	return (
		<ShortcutsCxProvider>
			<UpdaterCxProvider>
				{children}
				<AppRuntimeBridge />
			</UpdaterCxProvider>
		</ShortcutsCxProvider>
	);
};

export interface TMainWindowProviderProps {
	children: React.ReactNode;
}
