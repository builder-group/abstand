import { createForm } from 'feature-form';
import React from 'react';
import { Err, type TResult } from 'tuple-result';
import { zValidator } from 'validation-adapters/zod';
import * as z from 'zod';
import { specta } from '@/environment';
import { type TCatalogItem } from '@/modules/catalog';
import { IntentionsCx, useIntentionsCx } from '../IntentionsCx';

export class NewBlockIntentionCx {
	private readonly intentionsCx: IntentionsCx;

	public readonly $form = createForm<TNewBlockIntentionFormData>({
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
			},
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

	public async submit(): Promise<TResult<specta.Intention, string>> {
		const formData = this.$form.getValidData();
		if (formData == null) {
			return Err('Form is invalid');
		}

		const targets = formData.selectedTargets.map(
			(item): specta.CreateIntentionBlockTargetParams => {
				switch (item.type) {
					case 'app':
						return {
							type: 'app',
							stableId: item.app.stableId,
							name: item.app.name,
							bundleId: item.app.bundleId,
							processPath: item.app.processPath,
							icon: item.app.icon,
							color: item.app.color
						};
					case 'website':
						return {
							type: 'website',
							hostname: item.website.hostname,
							name: item.website.name,
							icon: item.website.icon,
							color: item.website.color
						};
				}
			}
		);

		return this.intentionsCx.create({
			name: formData.name.trim(),
			behavior: {
				type: 'block',
				scope: formData.scope,
				enforcementMode: formData.enforcementMode,
				targets
			}
		});
	}
}

interface TNewBlockIntentionFormData {
	name: string;
	scope: specta.IntentionBlockScope;
	selectedTargets: TCatalogItem[];
	enforcementMode: specta.IntentionEnforcementMode;
}

const ReactNewBlockIntentionCx = React.createContext<NewBlockIntentionCx | null>(null);

export const NewBlockIntentionCxProvider: React.FC<{ children: React.ReactNode }> = ({
	children
}) => {
	const intentionsCx = useIntentionsCx();
	const cx = React.useMemo(() => new NewBlockIntentionCx(intentionsCx), [intentionsCx]);

	return (
		<ReactNewBlockIntentionCx.Provider value={cx}>{children}</ReactNewBlockIntentionCx.Provider>
	);
};

export function useNewBlockIntentionCx(): NewBlockIntentionCx {
	const cx = React.useContext(ReactNewBlockIntentionCx);
	if (cx == null) {
		throw new Error('useNewBlockIntentionCx must be used within a NewBlockIntentionCxProvider');
	}
	return cx;
}
