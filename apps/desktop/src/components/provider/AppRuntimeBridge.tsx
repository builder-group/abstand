import React from 'react';
import { specta } from '@/environment';
import { createMountLifecycle } from '@/lib';
import { useToastsCx } from '../display/Toast';

export const AppRuntimeBridge: React.FC = () => {
	const toastsCx = useToastsCx();

	React.useEffect(() => {
		const lifecycle = createMountLifecycle();

		void (async () => {
			lifecycle.addCleanup(
				await specta.events.quitPreventedEvent.listen(({ payload }) => {
					switch (payload.reason) {
						case 'activeStrictBlock':
							toastsCx.add({
								type: 'warning',
								title: 'Quit prevented',
								description: 'Strict Enforcement is active. Abstand will stay open.'
							});
							break;
					}
				})
			);

			if (lifecycle.isUnmounted()) return;

			await specta.commands.notifyFrontendReady();
		})();

		return lifecycle.unmount;
	}, [toastsCx]);

	return null;
};
