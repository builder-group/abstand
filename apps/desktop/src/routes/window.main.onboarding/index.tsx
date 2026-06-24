import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { Spinner, useToastsCx, WindowHeader } from '@/components';
import {
	AccessibilityStep,
	FirstBlockStep,
	useCreateOnboardingCx,
	WelcomeStep
} from '@/modules/onboarding';

export const Route = createFileRoute('/window/main/onboarding/')({
	component: RouteComponent
});

function RouteComponent() {
	const navigate = useNavigate();
	const toastsCx = useToastsCx();
	const cx = useCreateOnboardingCx();
	const currentStep = useFeatureState(cx.$currentStep);
	const hasLoaded = useFeatureState(cx.$hasLoaded);

	const handleCreateBlock = React.useCallback(async () => {
		const [isCompleteOk, completeErr] = await cx.complete();
		if (!isCompleteOk) {
			toastsCx.add({
				type: 'error',
				title: 'Could not complete onboarding',
				description: completeErr
			});
			return;
		}

		void navigate({ to: '/window/main/intentions/new/block' });
	}, [cx, navigate, toastsCx]);

	return (
		<main className="bg-base-0 relative flex h-screen flex-col overflow-hidden">
			<WindowHeader floating showBadges={false} />
			{hasLoaded ? (
				<>
					{currentStep === 'welcome' && <WelcomeStep cx={cx} />}
					{currentStep === 'accessibility' && <AccessibilityStep cx={cx} />}
					{currentStep === 'firstBlock' && (
						<FirstBlockStep cx={cx} onCreateBlock={handleCreateBlock} />
					)}
				</>
			) : (
				<div className="flex flex-1 items-center justify-center">
					<Spinner size="md" />
				</div>
			)}
		</main>
	);
}
