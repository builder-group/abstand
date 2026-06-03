import React from 'react';
import { specta } from '@/environment';
import { createMountLifecycle } from '@/lib';
import { useToastsCx } from '../display/Toast';

export const AppEventToasts: React.FC = () => {
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
		})();

		return lifecycle.unmount;
	}, [toastsCx]);

	return null;
};
