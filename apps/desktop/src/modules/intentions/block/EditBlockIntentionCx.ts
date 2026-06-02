import { Err, Ok, type TResult } from 'tuple-result';
import { type specta } from '@/environment';
import { type IntentionsCx } from '../IntentionsCx';
import { BlockIntentionFormCx } from './BlockIntentionFormCx';

export class EditBlockIntentionCx {
	private readonly intentionsCx: IntentionsCx;

	public readonly intention: TBlockIntention;
	public readonly formCx: BlockIntentionFormCx;

	constructor(intentionsCx: IntentionsCx, intention: TBlockIntention) {
		const formCx = BlockIntentionFormCx.fromIntention(intention);
		if (formCx == null) {
			throw new Error('EditBlockIntentionCx requires a block intention');
		}

		this.intentionsCx = intentionsCx;
		this.intention = intention;
		this.formCx = formCx;
	}

	public getDeletePolicy(
		options: TEditBlockIntentionPolicyOptions
	): TEditBlockIntentionActionPolicy {
		return this.getActiveActionPolicy(options);
	}

	public getEndEarlyPolicy(
		options: TEditBlockIntentionPolicyOptions
	): TEditBlockIntentionActionPolicy {
		return this.getActiveActionPolicy(options);
	}

	public async getSavePolicy(): Promise<
		TResult<specta.IntentionEditPolicyAssessment, TEditBlockIntentionSavePolicyError>
	> {
		const params = this.formCx.getValidUpdateIntentionParams(this.intention.id);
		if (params == null) {
			return Err({ code: 'invalidForm' });
		}

		const [isPolicyOk, policyErr, policy] = await this.intentionsCx.assessEditPolicy(params);
		if (!isPolicyOk) {
			return Err({ code: 'assessmentFailed', message: policyErr });
		}
		if (policy == null) {
			return Err({ code: 'intentionMissing' });
		}

		return Ok(policy);
	}

	public async save(): Promise<TResult<specta.Intention, TEditBlockIntentionSaveError>> {
		const params = this.formCx.getValidUpdateIntentionParams(this.intention.id);
		if (params == null) {
			return Err({ code: 'invalidForm' });
		}

		const [isIntentionOk, intentionErr, intention] = await this.intentionsCx.update(params);
		if (!isIntentionOk) {
			return Err({ code: 'updateFailed', message: intentionErr });
		}

		// Note: Use the persisted intention so backend normalization becomes the clean baseline
		this.formCx.resetToIntention(intention);
		return Ok(intention);
	}

	private getActiveActionPolicy(
		options: TEditBlockIntentionPolicyOptions
	): TEditBlockIntentionActionPolicy {
		const { isActive } = options;
		if (!isActive) {
			return { type: 'available' };
		}

		switch (this.intention.behavior.enforcementMode) {
			case 'casual':
				return { type: 'available' };
			case 'balanced':
				return { type: 'delayed', durationMs: 15_000 };
			case 'strict':
				return { type: 'blocked' };
		}
	}
}

export type TBlockIntention = Omit<specta.Intention, 'behavior'> & {
	behavior: Extract<specta.IntentionBehavior, { type: 'block' }>;
};

interface TEditBlockIntentionPolicyOptions {
	isActive: boolean;
}

export type TEditBlockIntentionActionPolicy =
	| { type: 'available' }
	| { type: 'delayed'; durationMs: number }
	| { type: 'blocked' };

export type TEditBlockIntentionSavePolicyError =
	| { code: 'invalidForm' }
	| { code: 'assessmentFailed'; message: string }
	| { code: 'intentionMissing' };

export type TEditBlockIntentionSaveError =
	| { code: 'invalidForm' }
	| { code: 'updateFailed'; message: string };
