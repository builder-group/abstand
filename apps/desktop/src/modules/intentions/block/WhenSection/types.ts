import {
	type NewBlockIntentionCx,
	type TNewIntentionConditionFormData
} from '../NewBlockIntentionCx';

export interface TConditionRowsProps {
	cx: NewBlockIntentionCx;
	conditionRow: TConditionRow;
}

export interface TConditionRow {
	condition: TNewIntentionConditionFormData;
	errors: TConditionErrors;
	isEndOnRepeatingStart: boolean;
}

export type TConditionErrors = Partial<Record<keyof TNewIntentionConditionFormData, string>> &
	Record<string, string | undefined>;
