import { createForm } from 'feature-form';
import React from 'react';
import { Err, type TResult } from 'tuple-result';
import { zValidator } from 'validation-adapters/zod';
import * as z from 'zod';
import { specta } from '@/environment';
import { type TCatalogItem } from '@/modules/catalog';
import { IntentionsCx, useIntentionsCx } from '../IntentionsCx';

export class NewIntentionCx {
	private readonly intentionsCx: IntentionsCx;

	public readonly $baseForm = createForm<TNewIntentionBaseFormData>({
		fields: {
			name: {
				defaultValue: '',
				validator: zValidator(
					z
						.string()
						.trim()
						.min(1, 'Please enter a name')
						.max(80, 'Name must be 80 characters or less')
				)
			}
		}
	});
	public readonly $blockForm = createForm<TNewIntentionBlockFormData>({
		fields: {
			scope: {
				defaultValue: 'blockTargets'
			},
			selectedTargets: {
				defaultValue: []
			},
			enforcementMode: {
				defaultValue: 'balanced'
			}
		}
	});

	public constructor(intentionsCx: IntentionsCx) {
		this.intentionsCx = intentionsCx;
	}

	public mount(): () => void {
		return () => {};
	}

	public async submitBehavior(
		behaviorType: TIntentionBehaviorType
	): Promise<TResult<specta.Intention, string>> {
		const baseFormData = this.$baseForm.getValidData();
		if (baseFormData == null) {
			return Err('Form is invalid');
		}

		let input: specta.CreateIntentionParams;
		switch (behaviorType) {
			case 'block':
				input = { name: baseFormData.name.trim(), behavior: { type: 'block' } };
				break;
			case 'break':
				input = { name: baseFormData.name.trim(), behavior: { type: 'break' } };
				break;
		}

		return this.intentionsCx.create(input);
	}
}

const ReactNewIntentionCx = React.createContext<NewIntentionCx | null>(null);

export const NewIntentionCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const intentionsCx = useIntentionsCx();
	const cx = React.useMemo(() => new NewIntentionCx(intentionsCx), [intentionsCx]);

	React.useEffect(() => {
		return cx.mount();
	}, [cx]);

	return <ReactNewIntentionCx.Provider value={cx}>{children}</ReactNewIntentionCx.Provider>;
};

export function useNewIntentionCx(): NewIntentionCx {
	const cx = React.useContext(ReactNewIntentionCx);
	if (cx == null) {
		throw new Error('useNewIntentionCx must be used within a NewIntentionCxProvider');
	}
	return cx;
}

interface TNewIntentionBaseFormData {
	name: string;
}

interface TNewIntentionBlockFormData {
	scope: specta.IntentionBlockScope;
	selectedTargets: TCatalogItem[];
	enforcementMode: specta.IntentionEnforcementMode;
}

type TIntentionBehaviorType = 'block' | 'break';
