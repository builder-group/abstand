import {
	type BlockIntentionFormCx,
	type TBlockIntentionConditionFormData
} from '../../BlockIntentionFormCx';

export interface TConditionRowsProps {
	formCx: BlockIntentionFormCx;
	conditionRow: TConditionRow;
	isDisabled?: boolean;
}

export interface TConditionRow {
	condition: TBlockIntentionConditionFormData;
	errors: TConditionErrors;
	isEndOnRepeatingStart: boolean;
}

export type TConditionErrors = Partial<Record<keyof TBlockIntentionConditionFormData, string>> &
	Record<string, string | undefined>;
