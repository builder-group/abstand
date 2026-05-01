import React from 'react';

export function useDelayedValue<GValue>(
	value: GValue,
	delayMs: TDelayMsResolver<GValue> = 500
): GValue {
	const [delayedValue, setDelayedValue] = React.useState(value);
	const previousValueRef = React.useRef(value);

	const resolveDelayMs = React.useEffectEvent((nextValue: GValue, previousValue: GValue) => {
		return typeof delayMs === 'function' ? delayMs(nextValue, previousValue) : delayMs;
	});
	const staticDelayMs = typeof delayMs === 'number' ? delayMs : null;

	React.useEffect(() => {
		const previousValue = previousValueRef.current;
		previousValueRef.current = value;
		const nextDelayMs = Math.max(0, resolveDelayMs(value, previousValue));

		if (nextDelayMs === 0) {
			setDelayedValue(value);
			return;
		}

		const timeoutId = window.setTimeout(() => {
			setDelayedValue(value);
		}, nextDelayMs);

		return () => window.clearTimeout(timeoutId);
	}, [staticDelayMs, value]);

	return delayedValue;
}

type TDelayMsResolver<GValue> = number | ((nextValue: GValue, previousValue: GValue) => number);
