import { cva } from 'class-variance-authority';
import React from 'react';
import { Button } from '@/components';
import { onboardingStepOrder, type TOnboardingStep } from '../OnboardingCx';

export const OnboardingPanel: React.FC<TOnboardingPanelProps> = (props) => {
	const {
		icon,
		step,
		artworkTone,
		title,
		description,
		body,
		primaryAction,
		secondaryAction,
		onBack
	} = props;

	return (
		<section className="bg-base-0 flex min-h-0 flex-1 flex-col overflow-hidden">
			<div className={onboardingArtworkVariants({ tone: artworkTone })}>
				<div className="bg-base-0/70 text-base-950 ring-base-950/8 flex size-20 items-center justify-center rounded-[22px] shadow-sm ring-1 [&_svg:not([class*='size-'])]:size-9">
					{icon}
				</div>
				<div className="flex gap-1.5" aria-hidden>
					{onboardingStepOrder.map((item) => (
						<div key={item} className={onboardingStepDotVariants({ active: item === step })} />
					))}
				</div>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto px-6 pt-5 pb-8">
				<div className="mx-auto max-w-md">
					<h1 className="text-base-950 text-[24px] leading-tight font-semibold text-balance">
						{title}
					</h1>
					<div className="text-base-600 mt-2 text-[15px] leading-6 text-pretty">{description}</div>
					{body != null && <div className="mt-5">{body}</div>}

					<div className="mt-9 flex items-center gap-4">
						{onBack != null && (
							<Button type="button" variant="ghost" size="lg" onClick={onBack}>
								Back
							</Button>
						)}

						<div className="ml-auto flex gap-1.5">
							{secondaryAction != null && (
								<Button
									type="button"
									size="lg"
									disabled={secondaryAction.disabled}
									onClick={secondaryAction.onPress}
								>
									{secondaryAction.children}
								</Button>
							)}
							<Button
								type="button"
								variant="primary"
								size="lg"
								disabled={primaryAction.disabled}
								onClick={primaryAction.onPress}
							>
								{primaryAction.children}
							</Button>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
};

interface TOnboardingPanelProps {
	icon: React.ReactNode;
	step: TOnboardingStep;
	artworkTone: TOnboardingArtworkTone;
	title: string;
	description: React.ReactNode;
	body?: React.ReactNode;
	primaryAction: TOnboardingPanelAction;
	secondaryAction?: TOnboardingPanelAction;
	onBack?: () => void;
}

export interface TOnboardingPanelAction {
	children: React.ReactNode;
	disabled?: boolean;
	onPress: () => void;
}

type TOnboardingArtworkTone = 'blue' | 'green' | 'purple';

const onboardingArtworkVariants = cva(
	'before:to-base-0 before:via-base-0/25 relative flex h-52 shrink-0 flex-col items-center justify-center gap-4 overflow-hidden before:absolute before:inset-0 before:bg-linear-to-b before:from-transparent',
	{
		variants: {
			tone: {
				blue: 'bg-[radial-gradient(circle_at_28%_16%,color-mix(in_srgb,var(--color-info)_26%,transparent)_0%,transparent_38%),radial-gradient(circle_at_74%_10%,color-mix(in_srgb,var(--color-primary)_34%,transparent)_0%,transparent_40%),linear-gradient(180deg,color-mix(in_srgb,var(--color-base-50)_86%,var(--color-primary)_14%)_0%,var(--color-base-0)_92%)]',
				green:
					'bg-[radial-gradient(circle_at_22%_16%,color-mix(in_srgb,var(--color-info)_24%,transparent)_0%,transparent_42%),radial-gradient(circle_at_74%_14%,color-mix(in_srgb,var(--color-success)_30%,transparent)_0%,transparent_42%),linear-gradient(180deg,color-mix(in_srgb,var(--color-base-50)_86%,var(--color-success)_14%)_0%,var(--color-base-0)_92%)]',
				purple:
					'bg-[radial-gradient(circle_at_24%_14%,color-mix(in_srgb,var(--color-info)_24%,transparent)_0%,transparent_38%),radial-gradient(circle_at_78%_10%,color-mix(in_srgb,var(--color-secondary)_32%,transparent)_0%,transparent_42%),linear-gradient(180deg,color-mix(in_srgb,var(--color-base-50)_86%,var(--color-secondary)_14%)_0%,var(--color-base-0)_92%)]'
			}
		}
	}
);

const onboardingStepDotVariants = cva('size-1.5 rounded-full', {
	variants: {
		active: {
			true: 'bg-base-950',
			false: 'bg-base-300'
		}
	}
});
