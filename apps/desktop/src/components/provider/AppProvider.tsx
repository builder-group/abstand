import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import React from 'react';
import { SettingsCxProvider } from '@/modules/settings';
import { ToastsCxProvider } from '../display';
import { ThemeProvider } from './ThemeProvider';
import { TypographyProvider } from './TypographyProvider';

export const AppProvider: React.FC<TAppProviderProps> = (props) => {
	const { children } = props;

	return (
		<SettingsCxProvider>
			<TypographyProvider>
				<ThemeProvider>
					<ToastsCxProvider>
						{children}
						{import.meta.env.DEV ? (
							<TanStackRouterDevtools
								position="bottom-right"
								toggleButtonProps={{
									style: {
										width: '1rem',
										height: '1rem',
										overflow: 'hidden'
									}
								}}
							/>
						) : null}
					</ToastsCxProvider>
				</ThemeProvider>
			</TypographyProvider>
		</SettingsCxProvider>
	);
};

export interface TAppProviderProps {
	children: React.ReactNode;
}
