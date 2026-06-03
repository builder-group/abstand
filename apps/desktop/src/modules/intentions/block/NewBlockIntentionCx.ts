import { Err, Ok, type TResult } from 'tuple-result';
import { type specta } from '@/environment';
import { type IntentionsCx } from '../IntentionsCx';
import { BlockIntentionFormCx } from './BlockIntentionFormCx';

export class NewBlockIntentionCx {
	private readonly intentionsCx: IntentionsCx;

	public readonly formCx = new BlockIntentionFormCx({ mode: 'create' });

	constructor(intentionsCx: IntentionsCx) {
		this.intentionsCx = intentionsCx;
	}

	public async submit(): Promise<TResult<specta.Intention, TNewBlockIntentionSubmitError>> {
		const params = this.formCx.getValidCreateIntentionParams();
		if (params == null) {
			return Err({ code: 'invalidForm' });
		}

		const [isIntentionOk, intentionErr, intention] = await this.intentionsCx.create(params);
		if (!isIntentionOk) {
			return Err({ code: 'createFailed', message: intentionErr });
		}

		if (this.shouldStartNow()) {
			const [isStartOk, startErr] = await this.intentionsCx.start(intention.id);
			if (!isStartOk) {
				return Err({ code: 'startFailed', message: startErr, intention });
			}
		}

		return Ok(intention);
	}

	public shouldStartNow(): boolean {
		return this.formCx.$form.fields.conditions
			.get()
			.some((condition) => condition.transition === 'start' && condition.mode === 'now');
	}
}

export type TNewBlockIntentionSubmitError =
	| { code: 'invalidForm' }
	| { code: 'createFailed'; message: string }
	| { code: 'startFailed'; message: string; intention: specta.Intention };
