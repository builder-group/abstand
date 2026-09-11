import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import * as z from 'zod';
import { ContentPage, Spinner } from '@/components';
import { useIntentionsCx, type TBlockIntention } from '@/modules/intentions';
import { BlockIntentionPage, TIntentionAutoRunAction } from './components';

export const Route = createFileRoute('/window/main/_sidebar/intentions/$intentionId/')({
	params: {
		parse: (params) => {
			const result = SIntentionDetailRouteParams.safeParse(params);
			return result.success ? result.data : false;
		},
		stringify: (params) => ({
			intentionId: String(params.intentionId)
		})
	},
	validateSearch: (search) => {
		const result = SIntentionDetailRouteSearch.safeParse(search);
		return result.success ? result.data : {};
	},
	component: RouteComponent
});

const SIntentionDetailRouteParams = z.object({
	// Note: Use regex + Number instead of coercion so only positive decimal path segments match
	intentionId: z
		.string()
		.regex(/^[1-9]\d*$/)
		.transform(Number)
});

const SIntentionDetailRouteSearch = z.object({
	backTo: z.enum(['/window/main/today']).optional(),
	action: z.enum(['end']).optional()
});

function RouteComponent() {
	const navigate = useNavigate({ from: Route.fullPath });
	const { intentionId } = Route.useParams();
	const { backTo, action } = Route.useSearch();
	const intentionsCx = useIntentionsCx();
	const hasLoaded = useFeatureState(intentionsCx.$hasLoaded);
	const intention = useFeatureState(intentionsCx.getIntentionState(intentionId));
	const isActive = useCompute(
		intentionsCx.getActiveSessionState(intentionId),
		(activeSession) => activeSession?.status === 'active'
	);

	// MARK: - Actions

	const handleAutoRunActionConsumed = React.useCallback(
		(action: TIntentionAutoRunAction) => {
			switch (action) {
				case 'end':
					void navigate({
						search: ({ backTo }) => ({ backTo }),
						replace: true
					});
					break;
				default:
				// do nothing
			}
		},
		[navigate]
	);

	// MARK: - UI

	if (intention == null && !hasLoaded) {
		return (
			<ContentPage title="Loading Intention" subtitle={`ID ${intentionId}`} backTo={backTo}>
				<div className="text-base-400 flex items-center gap-2 text-sm">
					<Spinner />
					<span>Loading Intention...</span>
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
					autoRunAction={action}
					onAutoRunActionConsumed={handleAutoRunActionConsumed}
				/>
			);
		case 'break':
		default:
			return (
				<ContentPage title="Intention not found" subtitle={`ID ${intentionId}`} backTo={backTo} />
			);
	}
}
