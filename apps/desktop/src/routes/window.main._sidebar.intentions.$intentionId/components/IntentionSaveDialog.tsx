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
	TimerIcon,
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
	const timedSaveDurationMs = open && policy.status === 'delayed' ? policy.durationMs : undefined;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Save Changes</DialogTitle>
					<DialogDescription>{intention.name}</DialogDescription>
				</DialogHeader>
				<DialogBody className="space-y-2">
					<p>Save these changes to the running Intention?</p>
					{policy.status === 'delayed' && (
						<DelayedSaveMessage durationMs={timedSaveDurationMs} isRunning={open} />
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
						<TimedButton
							key={open ? 'open' : 'closed'}
							type="button"
							variant="primary"
							duration={timedSaveDurationMs}
							disabled={isPending}
							onClick={onSave}
						>
							Save Changes
						</TimedButton>
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
		return 'Strict Enforcement only allows changes that keep this running Intention at least as strong as it is now.';
	}

	const reasonLabels = reasons
		.map((reason) => {
			switch (reason) {
				case 'shortensEnd':
					return 'shorter end time';
				case 'removesAutomaticEnd':
					return 'automatic end removed';
				case 'lowersEnforcement':
					return 'lower enforcement';
				case 'weakensBlock':
					return 'weaker block';
			}
		})
		.join(', ');
	return `Strict Enforcement does not allow weakening this running Intention: ${reasonLabels}.`;
}

const DelayedSaveMessage: React.FC<TDelayedSaveMessageProps> = (props) => {
	const { durationMs, isRunning } = props;
	const remainingSaveDelayMs = useCountdown({
		durationMs,
		isRunning
	});

	if (remainingSaveDelayMs <= 0) {
		return null;
	}

	return (
		<Alert role="note" variant="info">
			<TimerIcon />
			<AlertDescription>{getDelayedSaveLabel(remainingSaveDelayMs)}</AlertDescription>
		</Alert>
	);
};

interface TDelayedSaveMessageProps {
	durationMs?: number;
	isRunning: boolean;
}

function getDelayedSaveLabel(remainingMs: number): string {
	const remainingSeconds = Math.ceil(remainingMs / 1_000);
	const unit = remainingSeconds === 1 ? 'second' : 'seconds';
	return `You can save in ${remainingSeconds} ${unit}.`;
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
