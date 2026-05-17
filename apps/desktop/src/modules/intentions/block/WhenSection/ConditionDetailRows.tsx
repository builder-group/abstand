import { useCompute } from 'feature-react/state';
import React from 'react';
import { AtTimeRows } from './AtTimeRows';
import { DurationRows } from './DurationRows';
import { RepeatsRows } from './RepeatsRows';
import { TimeOfDayRow } from './TimeOfDayRow';
import { type TConditionRowsProps } from './types';

export const ConditionDetailRows: React.FC<TConditionRowsProps> = (props) => {
	const { condition, cx } = props;
	const isEndOnRepeatingStart = useCompute(cx.$form.fields.conditions, ({ value }) => {
		const startCondition = value?.find((condition) => condition.transition === 'start') ?? null;
		return condition.transition === 'end' && startCondition?.mode === 'repeats';
	});

	switch (condition.mode) {
		case 'atTime':
			if (isEndOnRepeatingStart) {
				return <TimeOfDayRow condition={condition} cx={cx} ariaLabel="Condition time" />;
			}

			return <AtTimeRows condition={condition} cx={cx} />;
		case 'afterDelay':
		case 'afterDuration':
			return <DurationRows condition={condition} cx={cx} />;
		case 'repeats':
			return <RepeatsRows condition={condition} cx={cx} />;
		case 'manual':
		case 'now':
			return null;
	}
};
