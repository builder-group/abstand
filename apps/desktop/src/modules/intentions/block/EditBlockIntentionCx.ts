import { Err, Ok, type TResult } from 'tuple-result';
import { type specta } from '@/environment';
import { type IntentionsCx } from '../IntentionsCx';
import { BlockIntentionFormCx } from './BlockIntentionFormCx';

export class EditBlockIntentionCx {
	private readonly intentionsCx: IntentionsCx;
	private readonly intentionId: number;

	public readonly formCx: BlockIntentionFormCx;

	constructor(intentionsCx: IntentionsCx, intention: specta.Intention) {
		const formCx = BlockIntentionFormCx.fromIntention(intention);
		if (formCx == null) {
			throw new Error('EditBlockIntentionCx requires a block intention');
		}

		this.intentionsCx = intentionsCx;
		this.intentionId = intention.id;
		this.formCx = formCx;
	}

	public async save(): Promise<TResult<specta.Intention, TEditBlockIntentionSaveError>> {
		const params = this.formCx.getValidUpdateIntentionParams(this.intentionId);
		if (params == null) {
			return Err({ code: 'invalidForm' });
		}

		const [isIntentionOk, intentionErr, intention] = await this.intentionsCx.update(params);
		if (!isIntentionOk) {
			return Err({ code: 'updateFailed', message: intentionErr });
		}

		this.formCx.resetFromIntention(intention);
		return Ok(intention);
	}
}

export type TEditBlockIntentionSaveError =
	| { code: 'invalidForm' }
	| { code: 'updateFailed'; message: string };
