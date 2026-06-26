import React from 'react';
import { MoveRightIcon, ShieldIcon } from '@/components';
import type { OnboardingCx } from '../../OnboardingCx';
import { OnboardingPanel } from '../OnboardingPanel';

export const FirstBlockStep: React.FC<TFirstBlockStepProps> = (props) => {
	const { cx, onCreateBlock, onSkip } = props;

	return (
		<OnboardingPanel
			icon={<ShieldIcon />}
			step="firstBlock"
			artworkTone="purple"
			title="Turn a boundary into an Intention."
			description="Start small. Choose one or two places that pull you off course, then create a Block Intention that Abstand can hold for you when it matters."
			primaryAction={{
				children: (
					<>
						Create Block
						<MoveRightIcon />
					</>
				),
				onPress: onCreateBlock
			}}
			secondaryAction={{ children: 'Skip', onPress: onSkip }}
			onBack={() => cx.goBack()}
		/>
	);
};

interface TFirstBlockStepProps {
	cx: OnboardingCx;
	onCreateBlock: () => void;
	onSkip: () => void;
}
