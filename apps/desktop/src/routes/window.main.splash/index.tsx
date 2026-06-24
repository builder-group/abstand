import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { LogoIcon, WindowHeader } from '@/components';
import { useCreateOnboardingCx } from '@/modules/onboarding';

export const Route = createFileRoute('/window/main/splash/')({
	component: RouteComponent
});

function RouteComponent() {
	const navigate = useNavigate();
	const onboardingCx = useCreateOnboardingCx();
	const hasLoadedOnboarding = useFeatureState(onboardingCx.$hasLoaded);

	React.useEffect(() => {
		if (!hasLoadedOnboarding) {
			return;
		}

		const splashTimer = setTimeout(() => {
			void navigate({
				to: onboardingCx.isComplete() ? '/window/main/today' : '/window/main/onboarding'
			});
		}, 1000);

		return () => {
			clearTimeout(splashTimer);
		};
	}, [hasLoadedOnboarding, navigate, onboardingCx]);

	return (
		<main className="relative flex h-screen items-center justify-center">
			<WindowHeader floating showBadges={false} />
			<LogoIcon className="text-base-950 size-20" />
		</main>
	);
}
