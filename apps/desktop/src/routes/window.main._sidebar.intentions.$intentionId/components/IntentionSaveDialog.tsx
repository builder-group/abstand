import React from 'react';
import {
	Alert,
	AlertDescription,
	Button,
	Dialog,
	DialogBody,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	ShieldIcon,
	TimedButton,
	useToastsCx
} from '@/components';
import { type specta } from '@/environment';
import { useCountdown } from '@/hooks';
import {
	type EditBlockIntentionCx,
	type TEditBlockIntentionSavePolicyError
} from '@/modules/intentions';

const IntentionSaveDialog: React.FC<TIntentionSaveDialogProps> = (props) => {
	const { intention, open, policy, isPending, onOpenChange, onSave } = props;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Save changes</DialogTitle>
					<DialogDescription>{intention.name}</DialogDescription>
				</DialogHeader>
				<DialogBody className="space-y-2">
					<p>Save these changes to the running Intention?</p>
					{policy.status === 'delayed' && (
						<p className="text-base-500 text-sm">
							Balanced Enforcement requires a pause before weakening a running Intention.
						</p>
					)}
					{policy.status === 'blocked' && (
						<Alert role="note" variant="warning">
							<ShieldIcon />
							<AlertDescription>{getBlockedSaveDescription(policy.reasons)}</AlertDescription>
						</Alert>
					)}
				</DialogBody>
				<DialogFooter>
					<DialogClose render={<Button type="button" disabled={isPending} />}>
						{policy.status === 'blocked' ? 'Close' : 'Cancel'}
					</DialogClose>
					{policy.status === 'delayed' && (
						<DelayedSaveButton
							durationMs={policy.durationMs}
							isPending={isPending}
							isRunning={open}
							onSave={onSave}
						/>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

interface TIntentionSaveDialogProps {
	intention: specta.Intention;
	open: boolean;
	policy: specta.IntentionEditPolicyAssessment;
	isPending: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: () => void;
}

function getBlockedSaveDescription(reasons: specta.IntentionWeakeningReason[]): string {
	if (!reasons.length) {
		return 'Strict Enforcement blocks weakening this running Intention.';
	}

	const reasonLabels = reasons
		.map((reason) => {
			switch (reason) {
				case 'shortensEnd':
					return 'shorter end time';
				case 'removesAutomaticEnd':
					return 'removed automatic end';
				case 'lowersEnforcement':
					return 'lower enforcement';
				case 'lowersBalancedDelay':
					return 'shorter Balanced pause';
				case 'weakensBlock':
					return 'weaker block';
			}
		})
		.join(', ');
	return `Strict Enforcement blocks weakening this running Intention: ${reasonLabels}.`;
}

const DelayedSaveButton: React.FC<TDelayedSaveButtonProps> = (props) => {
	const { durationMs, isPending, isRunning, onSave } = props;
	const remainingSaveDelayMs = useCountdown({
		durationMs,
		isRunning
	});

	return (
		<TimedButton
			key={isRunning ? 'running' : 'idle'}
			type="button"
			variant="primary"
			duration={isRunning ? durationMs : undefined}
			disabled={isPending}
			onClick={onSave}
		>
			{getDelayedSaveActionLabel(remainingSaveDelayMs)}
		</TimedButton>
	);
};

interface TDelayedSaveButtonProps {
	durationMs: number;
	isPending: boolean;
	isRunning: boolean;
	onSave: () => void;
}

function getDelayedSaveActionLabel(remainingMs: number): string {
	if (remainingMs <= 0) {
		return 'Save changes';
	}

	const remainingSeconds = Math.ceil(remainingMs / 1_000);
	return `Save in ${remainingSeconds}s`;
}

export function useIntentionSaveDialog(
	options: TUseIntentionSaveDialogOptions
): TIntentionSaveDialogHandle {
	const { cx, isActive } = options;
	const toastsCx = useToastsCx();
	const [isOpen, setIsOpen] = React.useState(false);
	const [isPending, setIsPending] = React.useState(false);
	const [savePolicy, setSavePolicy] = React.useState<specta.IntentionEditPolicyAssessment>({
		status: 'available'
	});

	const getSavePolicy =
		React.useCallback(async (): Promise<specta.IntentionEditPolicyAssessment | null> => {
			if (!isActive) {
				return { status: 'available' };
			}

			setIsPending(true);
			try {
				const [isPolicyOk, policyErr, policy] = await cx.getSavePolicy();
				if (!isPolicyOk) {
					if (policyErr.code !== 'invalidForm') {
						toastsCx.add({
							type: 'error',
							title: 'Could not check save rules',
							description: getSavePolicyErrorDescription(policyErr)
						});
					}
					return null;
				}

				return policy;
			} finally {
				setIsPending(false);
			}
		}, [cx, isActive, toastsCx]);

	const saveIntention = React.useCallback(async (): Promise<boolean> => {
		setIsPending(true);
		try {
			const [isIntentionOk, intentionErr] = await cx.save();
			if (!isIntentionOk) {
				if (intentionErr.code === 'updateFailed') {
					toastsCx.add({
						type: 'error',
						title: 'Could not save Intention',
						description: intentionErr.message
					});
				}
				return false;
			}

			toastsCx.add({
				type: 'success',
				title: 'Saved Intention'
			});
			return true;
		} finally {
			setIsPending(false);
		}
	}, [cx, toastsCx]);

	const save = React.useCallback(() => {
		void (async () => {
			const nextSavePolicy = await getSavePolicy();
			if (nextSavePolicy == null) {
				return;
			}

			setSavePolicy(nextSavePolicy);
			if (nextSavePolicy.status === 'available') {
				void saveIntention();
				return;
			}

			setIsOpen(true);
		})();
	}, [getSavePolicy, saveIntention]);

	const handleSave = React.useCallback(async () => {
		const didSave = await saveIntention();
		if (didSave) {
			setIsOpen(false);
		}
	}, [saveIntention]);

	return {
		save,
		isPending,
		dialog: (
			<IntentionSaveDialog
				intention={cx.intention}
				open={isOpen}
				policy={savePolicy}
				isPending={isPending}
				onOpenChange={setIsOpen}
				onSave={handleSave}
			/>
		)
	};
}

interface TUseIntentionSaveDialogOptions {
	cx: EditBlockIntentionCx;
	isActive: boolean;
}

interface TIntentionSaveDialogHandle {
	save: () => void;
	isPending: boolean;
	dialog: React.ReactElement;
}

function getSavePolicyErrorDescription(error: TEditBlockIntentionSavePolicyError): string {
	switch (error.code) {
		case 'invalidForm':
			return 'Check the highlighted fields and try again.';
		case 'assessmentFailed':
			return error.message;
		case 'intentionMissing':
			return 'This Intention no longer exists.';
	}
}
