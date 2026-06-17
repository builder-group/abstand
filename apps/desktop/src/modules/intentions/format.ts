import { type specta } from '@/environment';
import { type TBlockIntention } from './block';

export function formatIntentionBehavior(intention: specta.Intention): string {
	switch (intention.behavior.type) {
		case 'block':
			return formatBlockScope(intention.behavior);
		case 'break':
			return 'Break';
	}
}

function formatBlockScope(block: TBlockIntention['behavior']): string {
	if (block.scope === 'wholeDevice') {
		return 'Whole device';
	}

	if (block.scope === 'allowTargets') {
		const targetLabel = formatTargetCounts(
			countTargets(block.appTargets, 'allow'),
			countTargets(block.websiteTargets, 'allow')
		);
		return `Allows ${targetLabel}`;
	}

	const targetLabel = formatTargetCounts(
		countTargets(block.appTargets, 'block'),
		countTargets(block.websiteTargets, 'block')
	);
	return `Blocks ${targetLabel}`;
}

function countTargets<TTarget extends { action: specta.IntentionBlockTargetAction }>(
	targets: TTarget[],
	action: specta.IntentionBlockTargetAction
): number {
	return targets.filter((target) => target.action === action).length;
}

function formatTargetCounts(appCount: number, websiteCount: number): string {
	const parts: string[] = [];
	if (appCount > 0) {
		parts.push(`${appCount} ${appCount === 1 ? 'app' : 'apps'}`);
	}
	if (websiteCount > 0) {
		parts.push(`${websiteCount} ${websiteCount === 1 ? 'website' : 'websites'}`);
	}

	return parts.length > 0 ? parts.join(', ') : 'no targets';
}
