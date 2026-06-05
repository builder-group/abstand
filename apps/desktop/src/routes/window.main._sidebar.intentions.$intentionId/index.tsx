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
	validateSearch: (search) => {
		const result = SIntentionRouteSearch.safeParse(search);
		return result.success ? result.data : {};
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

const SIntentionRouteSearch = z.object({
	backTo: z.enum(['/window/main/today']).optional()
});

function RouteComponent() {
	const { intentionId } = Route.useParams();
	const { backTo } = Route.useSearch();
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
			<ContentPage title="Loading intention" subtitle={`ID ${intentionId}`} backTo={backTo}>
				<div className="text-base-400 flex items-center gap-2 text-sm">
					<Spinner />
					<span>Loading intention...</span>
				</div>
			</ContentPage>
		);
	}

	switch (intention?.behavior.type) {
		case 'block':
			return (
				<BlockIntentionPage
					intention={intention as TBlockIntention}
					isActive={isActive}
					backTo={backTo}
				/>
			);
		case 'break':
		default:
			return (
				<ContentPage title="Intention not found" subtitle={`ID ${intentionId}`} backTo={backTo} />
			);
	}
}
