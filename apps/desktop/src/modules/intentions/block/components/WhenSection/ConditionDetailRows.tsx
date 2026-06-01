import React from 'react';
import { AtTimeRows } from './AtTimeRows';
import { DurationRows } from './DurationRows';
import { RepeatsRows } from './RepeatsRows';
import { TimeOfDayRow } from './TimeOfDayRow';
import { type TConditionRowsProps } from './types';

export const ConditionDetailRows: React.FC<TConditionRowsProps> = (props) => {
	const {
		conditionRow: {
			condition: { mode },
			isEndOnRepeatingStart
		}
	} = props;

	switch (mode) {
		case 'atTime':
			if (isEndOnRepeatingStart) {
				return <TimeOfDayRow {...props} ariaLabel="Condition time" />;
			}

			return <AtTimeRows {...props} />;
		case 'afterDelay':
		case 'afterDuration':
			return <DurationRows {...props} />;
		case 'repeats':
			return <RepeatsRows {...props} />;
		case 'manual':
		case 'now':
			return null;
	}
};
