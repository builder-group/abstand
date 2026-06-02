import { createFileRoute } from '@tanstack/react-router';
import { useCompute, useFeatureState } from 'feature-react/state';
import * as z from 'zod';
import { ContentPage, Spinner } from '@/components';
import { useIntentionsCx, type TBlockIntention } from '@/modules/intentions';
import { BlockIntentionPage } from './components';

export const Route = createFileRoute('/window/main/_sidebar/intentions/$intentionId/')({
	params: {
		parse: (params) => {
			const result = SIntentionRouteParams.safeParse(params);
			return result.success ? result.data : false;
		},
		stringify: (params) => ({
			intentionId: String(params.intentionId)
		})
	},
	component: RouteComponent
});

const SIntentionRouteParams = z.object({
	// Note: Use regex + Number instead of coercion so only positive decimal path segments match
	intentionId: z
		.string()
		.regex(/^[1-9]\d*$/)
		.transform(Number)
});

function RouteComponent() {
	const { intentionId } = Route.useParams();
	const intentionsCx = useIntentionsCx();
	const hasLoaded = useFeatureState(intentionsCx.$hasLoaded);
	const intention = useFeatureState(intentionsCx.getIntentionState(intentionId));
	const isActive = useCompute(
		intentionsCx.getActiveSessionState(intentionId),
		(activeSession) => activeSession?.status === 'active'
	);

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

	switch (intention?.behavior.type) {
		case 'block':
			return <BlockIntentionPage intention={intention as TBlockIntention} isActive={isActive} />;
		case 'break':
		default:
			return <ContentPage title="Intention not found" subtitle={`ID ${intentionId}`} />;
	}
}
