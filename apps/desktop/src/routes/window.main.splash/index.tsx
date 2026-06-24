import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import { LogoIcon, WindowHeader } from '@/components';
import { useSettingsCx } from '@/modules/settings';

export const Route = createFileRoute('/window/main/splash/')({
	component: RouteComponent
});

function RouteComponent() {
	const navigate = useNavigate();
	const settingsCx = useSettingsCx();
	const isOnboardingComplete = useCompute(
		settingsCx.$appSettings,
		(settings) => settings.onboarding.completedAt != null
	);
	const hasLoadedSettings = useFeatureState(settingsCx.$hasLoaded);

	React.useEffect(() => {
		if (!hasLoadedSettings) {
			return;
		}

		const splashTimer = setTimeout(() => {
			void navigate({
				to: isOnboardingComplete ? '/window/main/today' : '/window/main/onboarding'
			});
		}, 1000);

		return () => {
			clearTimeout(splashTimer);
		};
	}, [hasLoadedSettings, isOnboardingComplete, navigate]);

	return (
		<main className="relative flex h-screen items-center justify-center">
			<WindowHeader floating showBadges={false} />
			<LogoIcon className="text-base-950 size-20" />
		</main>
	);
}
