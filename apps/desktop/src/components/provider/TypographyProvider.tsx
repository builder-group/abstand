import { useSubscriber } from 'feature-react/state';
import React from 'react';
import { specta } from '@/environment';
import { useSettingsCx } from '@/modules/settings';

export const TypographyProvider: React.FC<TTypographyProviderProps> = (props) => {
	const { children } = props;
	const settingsCx = useSettingsCx();

	// MARK: - Effects

	// Note: on macOS, systemFontSize and smallSystemFontSize are fixed constants (13pt/11pt)
	// and match the CSS fallbacks, so this has no visible effect today. The hook exists
	// for platforms where the OS exposes a user-adjustable font size (e.g. Windows).
	useSubscriber(
		settingsCx.$appSettings,
		async ({ value, prevValue }) => {
			if (value.appearance.fontScale === prevValue?.appearance.fontScale) {
				return;
			}

			const systemTypography = await specta.commands.getSystemTypography();

			setFontSizeVariable(
				'--app-font-size-base',
				systemTypography.baseFontSize * value.appearance.fontScale
			);
			setFontSizeVariable(
				'--app-font-size-small',
				systemTypography.smallFontSize * value.appearance.fontScale
			);
		},
		[]
	);

	// MARK: - UI

	return <>{children}</>;
};

export interface TTypographyProviderProps {
	children: React.ReactNode;
}

function setFontSizeVariable(name: string, value: number) {
	if (!Number.isFinite(value) || value <= 0) {
		return;
	}

	document.documentElement.style.setProperty(name, `${value}px`);
}
