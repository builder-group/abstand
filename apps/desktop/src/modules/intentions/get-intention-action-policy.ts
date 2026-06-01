import { type specta } from '@/environment';

export function getIntentionActionPolicy(
	intention: specta.Intention,
	options: TGetIntentionActionPolicyOptions
): TIntentionActionPolicy {
	const { isActive } = options;
	if (!isActive || intention.behavior.type !== 'block') {
		return { type: 'available' };
	}

	switch (intention.behavior.enforcementMode) {
		case 'casual':
			return { type: 'available' };
		case 'balanced':
			return { type: 'delayed', durationMs: 15_000 };
		case 'strict':
			return { type: 'blocked' };
	}
}

interface TGetIntentionActionPolicyOptions {
	isActive: boolean;
}

export type TIntentionActionPolicy =
	| { type: 'available' }
	| { type: 'delayed'; durationMs: number }
	| { type: 'blocked' };
