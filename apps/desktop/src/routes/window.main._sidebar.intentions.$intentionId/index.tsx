import { createFileRoute } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import { ContentPage } from '@/components';
import { useIntentionsCx } from '@/modules/intentions';

export const Route = createFileRoute('/window/main/_sidebar/intentions/$intentionId/')({
	component: RouteComponent
});

function RouteComponent() {
	const { intentionId } = Route.useParams();
	const intentionsCx = useIntentionsCx();
	const intention = useFeatureState(intentionsCx.intentions[Number(intentionId)]);

	// MARK: - UI

	if (intention == null) {
		return <ContentPage title="Intention not found" subtitle={`ID ${intentionId}`} />;
	}

	return (
		<ContentPage title={intention.name} subtitle="Intention placeholder.">
			<p className="text-base-500 text-[13px]">ID {intention.id}</p>
		</ContentPage>
	);
}
