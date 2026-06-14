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

	const targetLabel = formatTargetCounts(block.apps.length, block.websites.length);
	if (block.scope === 'allowTargets') {
		return `Allows ${targetLabel}`;
	}

	return `Blocks ${targetLabel}`;
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
