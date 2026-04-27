import { createFileRoute } from '@tanstack/react-router';
import { unwrapOrNull } from 'tuple-result';
import { ContentPage } from '@/components';
import { specta } from '@/environment';
import { toTuple } from '@/lib';

export const Route = createFileRoute('/window/main/_sidebar/intentions/$intentionId/')({
	loader: async ({ params }) => {
		const intentionId = Number(params.intentionId);
		if (!Number.isFinite(intentionId)) {
			return null;
		}

		const intentionResult = toTuple(await specta.commands.getIntention(intentionId));
		return unwrapOrNull(intentionResult);
	},
	component: RouteComponent
});

function RouteComponent() {
	const { intentionId } = Route.useParams();
	const intention = Route.useLoaderData();

	// MARK: - UI

	if (intention == null) {
		return <ContentPage title="Intention not found" subtitle={`ID ${intentionId}`} />;
	}

	return (
		<ContentPage title={intention.name} subtitle="Intention placeholder.">
			<p className="text-base-500 text-sm">ID {intention.id}</p>
		</ContentPage>
	);
}
