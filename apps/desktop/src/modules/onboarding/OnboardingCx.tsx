import { localStorageFeature } from 'feature-react/state';
import {
	createComputed,
	createState,
	type TComputedState,
	type TState,
	type TStorageFeature
} from 'feature-state';
import React from 'react';
import type { TResult } from 'tuple-result';
import { specta } from '@/environment';
import { createMountLifecycle, toTuple } from '@/lib';

export class OnboardingCx {
	private readonly $stepper: TState<TOnboardingStepperState, [TStorageFeature]> =
		createState<TOnboardingStepperState>({
			currentStepIndex: 0,
			visitedSteps: [{ type: 'welcome' }]
		}).with(localStorageFeature<TOnboardingStepperState>('abstand:onboarding:stepper:v2'));
	private readonly $completedAt: TState<number | null, [TStorageFeature]> = createState<
		number | null
	>(null).with(localStorageFeature<number | null>('abstand:onboarding:completed-at'));
	public readonly $currentStep: TComputedState<
		TOnboardingStep,
		readonly [TState<TOnboardingStepperState, [TStorageFeature]>]
	> = createComputed(
		this.$stepper,
		(stepper) => stepper.visitedSteps[stepper.currentStepIndex]?.type ?? 'welcome'
	);

	public readonly $hasLoaded = createState(false);
	public readonly $isRestartingApp = createState(false);

	public readonly $isAccessibilityGranted = createState<boolean | null>(null);
	public readonly $isAccessibilityStatusPending = createState(true);
	public readonly $isOpeningAccessibilitySettings = createState(false);
	public readonly $isAccessibilityRestartRequired: TComputedState<
		boolean,
		readonly [TState<TOnboardingStepperState, [TStorageFeature]>]
	> = createComputed(this.$stepper, (stepper) =>
		stepper.visitedSteps.some(
			(step) => step.type === 'accessibility' && step.restartRequiredAt != null
		)
	);

	private lastIsAccessibilityGranted: boolean | null = null;

	public mount(): () => void {
		const lifecycle = createMountLifecycle();

		void (async () => {
			await Promise.all([this.$stepper.persist(), this.$completedAt.persist()]);
			if (lifecycle.isUnmounted()) return;

			if (this.isComplete()) {
				this.$hasLoaded.set(true);
				return;
			}

			this.updateStep('accessibility', { restartRequiredAt: undefined });
			await this.loadAccessibilityStatus();
			if (lifecycle.isUnmounted()) return;

			this.$hasLoaded.set(true);

			window.addEventListener('focus', this.handleWindowFocus);
			lifecycle.addCleanup(() => {
				window.removeEventListener('focus', this.handleWindowFocus);
			});
		})();

		return lifecycle.unmount;
	}

	private readonly handleWindowFocus = (): void => {
		void this.loadAccessibilityStatus();
	};

	public complete(): void {
		this.$completedAt.set(Date.now());
		void this.resetStepper();
	}

	public isComplete(): boolean {
		return this.$completedAt.get() != null;
	}

	public goToStep(step: TOnboardingStep): void {
		this.$stepper.set((stepper) => {
			const existingStepIndex = stepper.visitedSteps.findIndex((item) => item.type === step);
			if (existingStepIndex !== -1) {
				return {
					...stepper,
					currentStepIndex: existingStepIndex
				};
			}

			return {
				currentStepIndex: stepper.visitedSteps.length,
				visitedSteps: [...stepper.visitedSteps, { type: step }]
			};
		});
	}

	public goBack(): void {
		const stepper = this.$stepper.get();
		if (stepper.currentStepIndex <= 0) {
			return;
		}

		this.$stepper.set({
			...stepper,
			currentStepIndex: stepper.currentStepIndex - 1
		});
	}

	private updateStep(step: TOnboardingStep, data: TOnboardingStepData): boolean {
		let didUpdate = false;

		this.$stepper.set((stepper) => {
			const existingStepIndex = stepper.visitedSteps.findIndex((item) => item.type === step);
			if (existingStepIndex === -1) {
				return stepper;
			}

			const nextStep = {
				...stepper.visitedSteps[existingStepIndex],
				...data,
				type: step
			};

			const visitedSteps = [...stepper.visitedSteps];
			visitedSteps[existingStepIndex] = nextStep;
			didUpdate = true;

			return {
				...stepper,
				visitedSteps
			};
		});

		return didUpdate;
	}

	public async restartApp(): Promise<TResult<null, string>> {
		this.$isRestartingApp.set(true);
		try {
			return toTuple(await specta.commands.restartApp());
		} finally {
			this.$isRestartingApp.set(false);
		}
	}

	public async openAccessibilitySettings(): Promise<TResult<null, string>> {
		this.$isOpeningAccessibilitySettings.set(true);
		try {
			return toTuple(await specta.commands.openAccessibilityPermissionSettings());
		} finally {
			this.$isOpeningAccessibilitySettings.set(false);
		}
	}

	public skipAccessibility(): void {
		this.updateStep('accessibility', { skippedAt: Date.now() });
		this.goToStep('firstBlock');
	}

	private async loadAccessibilityStatus(): Promise<void> {
		this.$isAccessibilityStatusPending.set(true);
		try {
			const nextIsGranted = await specta.commands.isAccessibilityPermissionGranted();
			const previousIsGranted = this.lastIsAccessibilityGranted;

			this.lastIsAccessibilityGranted = nextIsGranted;
			this.$isAccessibilityGranted.set(nextIsGranted);

			if (!nextIsGranted) {
				this.updateStep('accessibility', {
					grantedAt: undefined,
					restartRequiredAt: undefined
				});
				return;
			}

			if (previousIsGranted === true) {
				return;
			}

			const grantedAt = Date.now();
			this.updateStep('accessibility', {
				grantedAt,
				restartRequiredAt: previousIsGranted === false ? grantedAt : undefined
			});
		} finally {
			this.$isAccessibilityStatusPending.set(false);
		}
	}

	private async resetStepper(): Promise<void> {
		this.$stepper.set({
			currentStepIndex: 0,
			visitedSteps: [{ type: 'welcome' }]
		});
		await this.$stepper.deleteFromStorage();
	}
}

export function useCreateOnboardingCx(): OnboardingCx {
	const cx = React.useMemo(() => new OnboardingCx(), []);

	React.useEffect(() => {
		return cx.mount();
	}, [cx]);

	return cx;
}

export const onboardingStepOrder = ['welcome', 'accessibility', 'firstBlock'] as const;

export type TOnboardingStep = (typeof onboardingStepOrder)[number];

interface TOnboardingStepperState {
	currentStepIndex: number;
	visitedSteps: TOnboardingStepState[];
}

interface TOnboardingStepState {
	type: TOnboardingStep;
	grantedAt?: number;
	restartRequiredAt?: number;
	skippedAt?: number;
}

type TOnboardingStepData = Omit<Partial<TOnboardingStepState>, 'type'>;
