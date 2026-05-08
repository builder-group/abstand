import React from 'react';
import { specta } from '@/environment';
import { useStableCallback } from '@/hooks';
import { createMountLifecycle } from '@/lib';

export function useOnShortcutTriggered(callback: (action: specta.ShortcutAction) => void): void {
	const handleShortcut = useStableCallback(callback);

	React.useEffect(() => {
		const lifecycle = createMountLifecycle();

		void (async () => {
			lifecycle.addCleanup(
				await specta.events.shortcutTriggeredEvent.listen((event) => handleShortcut(event.payload))
			);
		})();

		return lifecycle.unmount;
	}, [handleShortcut]);
}
