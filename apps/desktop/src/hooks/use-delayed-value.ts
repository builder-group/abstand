import React from 'react';

/** Returns a value that updates after a fixed or transition-specific delay, with 0 meaning immediate updates. */
export function useDelayedValue<GValue>(
	value: GValue,
	delayMs: TDelayMsResolver<GValue> = 500
): GValue {
	const [delayedValue, setDelayedValue] = React.useState(value);
	const previousValueRef = React.useRef(value);

	// Track numeric delay in deps while resolving functions without depending on them
	const getDelayMs = React.useEffectEvent((nextValue: GValue, previousValue: GValue) => {
		return typeof delayMs === 'function' ? delayMs(nextValue, previousValue) : delayMs;
	});
	const delayMsDep = typeof delayMs === 'number' ? delayMs : null;

	React.useEffect(() => {
		const previousValue = previousValueRef.current;
		previousValueRef.current = value;
		const nextDelayMs = Math.max(0, getDelayMs(value, previousValue));

		if (nextDelayMs === 0) {
			setDelayedValue(value);
			return;
		}

		const timeoutId = window.setTimeout(() => {
			setDelayedValue(value);
		}, nextDelayMs);

		return () => window.clearTimeout(timeoutId);
	}, [delayMsDep, value]);

	return delayedValue;
}

type TDelayMsResolver<GValue> = number | ((nextValue: GValue, previousValue: GValue) => number);
