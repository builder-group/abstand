import { type TValidationStatusValue } from 'feature-form';
import { useCompute } from 'feature-react/state';
import React from 'react';
import { type specta } from '@/environment';
import {
	createDefaultNewIntentionCondition,
	type NewBlockIntentionCx
} from '../NewBlockIntentionCx';
import { type TConditionErrors, type TConditionRow } from './types';

export function useConditionRow(
	cx: NewBlockIntentionCx,
	transition: specta.IntentionConditionTransition
): TConditionRow {
	const fallbackCondition = React.useMemo(
		() => createDefaultNewIntentionCondition(transition),
		[transition]
	);

	return useCompute(
		[cx.$form.fields.conditions, cx.$form.fields.conditions.status] as const,
		([conditions, conditionsStatus]) => {
			const conditionIndex = conditions.findIndex(
				(condition) => condition.transition === transition
			);
			const condition = conditions[conditionIndex] ?? fallbackCondition;

			const startCondition =
				conditions.find((condition) => condition.transition === 'start') ??
				(transition === 'start' ? condition : null);

			return {
				condition,
				errors: getConditionErrors(conditionsStatus, conditionIndex),
				isEndOnRepeatingStart: transition === 'end' && startCondition?.mode === 'repeats'
			};
		},
		[fallbackCondition, transition],
		areConditionRowsEqual
	);
}

function areConditionRowsEqual(next: TConditionRow, current: TConditionRow): boolean {
	return (
		next.condition === current.condition &&
		next.isEndOnRepeatingStart === current.isEndOnRepeatingStart &&
		areConditionErrorsEqual(next.errors, current.errors)
	);
}

function areConditionErrorsEqual(a: TConditionErrors, b: TConditionErrors): boolean {
	for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
		if (a[key] !== b[key]) {
			return false;
		}
	}
	return true;
}

function getConditionErrors(
	conditionsStatus: TValidationStatusValue,
	conditionIndex: number
): TConditionErrors {
	const errors: TConditionErrors = {};
	if (conditionIndex < 0 || conditionsStatus.type !== 'invalid') {
		return errors;
	}

	for (const error of conditionsStatus.errors) {
		const [index, key] = error.path ?? [];
		if (index !== conditionIndex || typeof key !== 'string') {
			continue;
		}

		errors[key] ??= error.message;
	}

	return errors;
}
