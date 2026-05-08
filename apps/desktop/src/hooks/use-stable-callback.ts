import React from 'react';

export function useStableCallback<GArgs extends unknown[], GReturn>(
	callback: (...args: GArgs) => GReturn
): (...args: GArgs) => GReturn {
	const callbackRef = React.useRef(callback);

	React.useLayoutEffect(() => {
		callbackRef.current = callback;
	}, [callback]);

	return React.useCallback((...args: GArgs) => callbackRef.current(...args), []);
}
