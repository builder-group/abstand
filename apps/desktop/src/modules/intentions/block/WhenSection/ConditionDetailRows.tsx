import React from 'react';
import { AtTimeRows } from './AtTimeRows';
import { InTimeRows } from './InTimeRows';
import { RepeatsRows } from './RepeatsRows';
import { type TConditionRowsProps } from './types';

export const ConditionDetailRows: React.FC<TConditionRowsProps> = (props) => {
	const { condition, cx } = props;

	switch (condition.mode) {
		case 'atTime':
			return <AtTimeRows condition={condition} cx={cx} />;
		case 'inTime':
			return <InTimeRows condition={condition} cx={cx} />;
		case 'repeats':
			return <RepeatsRows condition={condition} cx={cx} />;
		case 'manual':
		case 'now':
			return null;
	}
};
