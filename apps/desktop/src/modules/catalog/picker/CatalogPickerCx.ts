import { createState } from 'feature-state';
import { specta } from '@/environment';
import { createComputedState, createMountLifecycle } from '@/lib';

export class CatalogPickerCx {
	public readonly $isOpen = createState(false);
	public readonly $selectedItems = createState<TCatalogItem[]>([]);
	private readonly $confirmedItems = createState<TCatalogItem[]>([]);
	public readonly $iconAssets = createState<Record<string, string>>({});

	private readonly _hooks: {
		onConfirm: (items: TCatalogItem[]) => void;
	} = { onConfirm: () => {} };

	constructor(onConfirm: (items: TCatalogItem[]) => void) {
		this._hooks.onConfirm = onConfirm;
	}

	public readonly $isDirty = createComputedState(
		[this.$selectedItems, this.$confirmedItems] as const,
		([selectedItems, committedItems]) => {
			if (selectedItems.length !== committedItems.length) {
				return true;
			}

			const committedKeys = new Set(committedItems.map(getCatalogItemKey));
			return selectedItems.some((item) => !committedKeys.has(getCatalogItemKey(item)));
		}
	);

	public mount(): () => void {
		const lifecycle = createMountLifecycle();

		void (async () => {
			lifecycle.addCleanup(
				await specta.events.catalogAssetLoadedEvent.listen((event) => {
					const { itemId, icon } = event.payload;
					if (icon == null) return;
					const key = catalogItemIdToKey(itemId);
					this.$iconAssets.set({ ...this.$iconAssets._v, [key]: icon });
				})
			);
		})();

		return lifecycle.unmount;
	}

	public open(items: TCatalogItem[]): void {
		this.$confirmedItems.set([...items]);
		this.$selectedItems.set([...items]);
		this.$isOpen.set(true);
	}

	public toggle(item: TCatalogItem): void {
		const current = this.$selectedItems._v;
		const has = current.some((i) => getCatalogItemKey(i) === getCatalogItemKey(item));
		this.$selectedItems.set(
			has
				? current.filter((i) => getCatalogItemKey(i) !== getCatalogItemKey(item))
				: [...current, item]
		);
	}

	public remove(item: TCatalogItem): void {
		this.$selectedItems.set(
			this.$selectedItems._v.filter((i) => getCatalogItemKey(i) !== getCatalogItemKey(item))
		);
	}

	public confirm(): void {
		this.$confirmedItems.set([...this.$selectedItems._v]);
		this._hooks.onConfirm(this.$selectedItems._v);
		this.$isOpen.set(false);
	}

	public cancel(): void {
		this.$selectedItems.set([...this.$confirmedItems._v]);
		this.$isOpen.set(false);
	}
}

export type TCatalogItem =
	| { type: 'app'; app: specta.CatalogAppSearchResultDto }
	| { type: 'website'; website: specta.CatalogWebsiteSearchResultDto };

export function getCatalogItemKey(item: TCatalogItem): string {
	return item.type === 'app' ? `app:${item.app.stableId}` : `website:${item.website.hostname}`;
}

export function catalogItemIdToKey(itemId: specta.CatalogItemId): string {
	return itemId.type === 'app' ? `app:${itemId.stableId}` : `website:${itemId.hostname}`;
}

export function toCatalogItem(result: specta.CatalogSearchResultDto): TCatalogItem {
	return result.type === 'app'
		? { type: 'app', app: result.app }
		: { type: 'website', website: result.website };
}

export function getCatalogItemLabel(item: TCatalogItem): string {
	return item.type === 'app'
		? (item.app.name ?? item.app.bundleId ?? item.app.stableId)
		: (item.website.name ?? item.website.hostname);
}

export function getCatalogItemSublabel(item: TCatalogItem): string {
	return item.type === 'app' ? (item.app.bundleId ?? item.app.stableId) : item.website.hostname;
}
