import { createFileRoute } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import { ContentPage, Spinner } from '@/components';
import { useIntentionsCx } from '@/modules/intentions';

export const Route = createFileRoute('/window/main/_sidebar/intentions/$intentionId/')({
	component: RouteComponent
});

function RouteComponent() {
	const { intentionId } = Route.useParams();
	const intentionsCx = useIntentionsCx();
	const hasLoaded = useFeatureState(intentionsCx.$hasLoaded);
	const intention = useFeatureState(intentionsCx.intentions[Number(intentionId)]);

	// MARK: - UI

	if (intention == null && !hasLoaded) {
		return (
			<ContentPage title="Loading intention" subtitle={`ID ${intentionId}`}>
				<div className="text-base-400 flex items-center gap-2 text-sm">
					<Spinner />
					<span>Loading intention...</span>
				</div>
			</ContentPage>
		);
	}

	if (intention == null) {
		return <ContentPage title="Intention not found" subtitle={`ID ${intentionId}`} />;
	}

	return (
		<ContentPage title={intention.name} subtitle="Intention saved.">
			<p className="text-base-500 text-sm">Hello intention #{intention.id}</p>
		</ContentPage>
	);
}
