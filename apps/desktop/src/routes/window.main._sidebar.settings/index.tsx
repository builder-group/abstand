import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/window/main/_sidebar/settings/')({
	beforeLoad: () => {
		throw Route.redirect({
			to: '/window/main/settings/general',
			replace: true
		});
	}
});
