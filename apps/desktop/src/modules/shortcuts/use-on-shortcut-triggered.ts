import React from 'react';
import { specta } from '@/environment';
import { createMountLifecycle } from '@/lib';

export function useOnShortcutTriggered(callback: (action: specta.ShortcutAction) => void): void {
	const callbackRef = React.useRef(callback);
	callbackRef.current = callback;

	React.useEffect(() => {
		const lifecycle = createMountLifecycle();

		void (async () => {
			lifecycle.addCleanup(
				await specta.events.shortcutTriggeredEvent.listen((event) =>
					callbackRef.current(event.payload)
				)
			);
		})();

		return lifecycle.unmount;
	}, []);
}
