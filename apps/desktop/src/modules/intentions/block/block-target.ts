import { specta } from '@/environment';

export function addBlockTarget(targets: TBlockTarget[], target: TBlockTarget): TBlockTarget[] {
	if (hasBlockTarget(targets, target)) {
		return targets;
	}

	return [...targets, target];
}

export function removeBlockTarget(targets: TBlockTarget[], target: TBlockTarget): TBlockTarget[] {
	return targets.filter((item) => getBlockTargetKey(item) !== getBlockTargetKey(target));
}

export function hasBlockTarget(targets: TBlockTarget[], target: TBlockTarget): boolean {
	return targets.some((item) => getBlockTargetKey(item) === getBlockTargetKey(target));
}

export function getBlockTargetKey(target: TBlockTarget): string {
	return target.type === 'app' ? `app:${target.app.appId}` : `website:${target.website.domain}`;
}

export function toBlockTarget(result: specta.CatalogSearchResultDto): TBlockTarget {
	if (result.type === 'app') {
		return { type: 'app', app: result.app };
	}

	return { type: 'website', website: result.website };
}

export function getBlockTargetLabel(target: TBlockTarget): string {
	return target.type === 'app'
		? (target.app.name ?? target.app.bundleId ?? target.app.appId)
		: (target.website.name ?? target.website.domain);
}

export function getBlockTargetSublabel(target: TBlockTarget): string {
	return target.type === 'app' ? (target.app.bundleId ?? target.app.appId) : target.website.domain;
}

export type TBlockTarget =
	| { type: 'app'; app: specta.CatalogAppSearchResultDto }
	| { type: 'website'; website: specta.CatalogWebsiteSearchResultDto };
