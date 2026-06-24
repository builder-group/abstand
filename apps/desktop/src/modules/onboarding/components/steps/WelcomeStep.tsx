import React from 'react';
import { LogoIcon } from '@/components';
import type { OnboardingCx } from '../../OnboardingCx';
import { OnboardingPanel } from '../OnboardingPanel';

export const WelcomeStep: React.FC<TWelcomeStepProps> = (props) => {
	const { cx } = props;

	return (
		<OnboardingPanel
			icon={<LogoIcon className="size-11" />}
			step="welcome"
			artworkTone="blue"
			title="Welcome to Abstand"
			description={
				<>
					<p>
						Your attention is like a river. Concentrated, it moves with power. Branched across tabs,
						apps, notifications, and quick checks, it spreads thin. You feel busy. Nothing moves.
					</p>
					<p className="mt-3">
						Abstand helps you build the banks ahead of time. Choose your boundaries while you are
						clear-headed, and Abstand holds them when it matters.
					</p>
				</>
			}
			primaryAction={{ children: 'Continue', onPress: () => cx.goToStep('accessibility') }}
		/>
	);
};

interface TWelcomeStepProps {
	cx: OnboardingCx;
}
