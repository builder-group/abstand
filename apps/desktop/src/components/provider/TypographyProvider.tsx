import React from 'react';
import { specta } from '@/environment';
import { createMountLifecycle } from '@/lib';

export const TypographyProvider: React.FC<TTypographyProviderProps> = (props) => {
	const { children } = props;

	// MARK: - Effects

	// Note: on macOS, systemFontSize and smallSystemFontSize are fixed constants (13pt/11pt)
	// and match the CSS fallbacks, so this has no visible effect today. The hook exists
	// for platforms where the OS exposes a user-adjustable font size (e.g. Windows).
	React.useEffect(() => {
		const lifecycle = createMountLifecycle();

		void (async () => {
			const typography = await specta.commands.getSystemTypography();
			if (!lifecycle.isUnmounted()) {
				setFontSizeVariable('--app-font-size-base', typography.baseFontSize);
				setFontSizeVariable('--app-font-size-small', typography.smallFontSize);
			}
		})();

		return () => lifecycle.unmount();
	}, []);

	// MARK: - UI

	return <>{children}</>;
};

const setFontSizeVariable = (name: string, value: number) => {
	if (!Number.isFinite(value) || value <= 0) {
		return;
	}

	document.documentElement.style.setProperty(name, `${value}px`);
};

export interface TTypographyProviderProps {
	children: React.ReactNode;
}
