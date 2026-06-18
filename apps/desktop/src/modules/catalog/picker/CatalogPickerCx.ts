import { createComputed, createState } from 'feature-state';
import { specta } from '@/environment';
import { createMountLifecycle, toTuple } from '@/lib';

export class CatalogPickerCx {
	private readonly _hooks: {
		onConfirm: (items: TCatalogItem[]) => void;
	} = { onConfirm: () => {} };

	public readonly $isOpen = createState(false);

	public readonly $selectedItems = createState<TCatalogItem[]>([]);
	private readonly $confirmedItems = createState<TCatalogItem[]>([]);

	public readonly $searchQuery = createState('');
	public readonly $searchResults = createState<TCatalogItem[]>([]);
	public readonly $isSearching = createState(false);
	private _searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	private _latestSearchRequestId = 0;

	constructor(onConfirm: (items: TCatalogItem[]) => void) {
		this._hooks.onConfirm = onConfirm;
	}

	public readonly $isDirty = createComputed(
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
					const { itemId, icon, color } = event.payload;
					if (icon == null && color == null) {
						return;
					}

					const itemKey = catalogItemIdToKey(itemId);
					this.$searchResults.set((items) =>
						patchCatalogItemsWithAsset(items, itemKey, { icon, color })
					);
					this.$selectedItems.set((items) =>
						patchCatalogItemsWithAsset(items, itemKey, { icon, color })
					);
				})
			);
		})();

		lifecycle.addCleanup(() => {
			this._clearSearchDebounceTimer();
			this._latestSearchRequestId += 1;
		});

		return lifecycle.unmount;
	}

	public open(items: TCatalogItem[]): void {
		this._resetSearchState();
		this.$confirmedItems.set([...items]);
		this.$selectedItems.set([...items]);
		this.$isOpen.set(true);
	}

	public toggle(item: TCatalogItem): void {
		const current = this.$selectedItems._v;
		const itemKey = getCatalogItemKey(item);
		const has = current.some((i) => getCatalogItemKey(i) === itemKey);
		this.$selectedItems.set(
			has ? current.filter((i) => getCatalogItemKey(i) !== itemKey) : [...current, item]
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

	public setSearchQuery(value: string): void {
		this.$searchQuery.set(value);
		this._clearSearchDebounceTimer();

		const searchQuery = value.trim();
		if (searchQuery.length === 0) {
			this._latestSearchRequestId += 1;
			this.$searchResults.set([]);
			this.$isSearching.set(false);
			return;
		}

		const requestId = this._latestSearchRequestId + 1;
		this._latestSearchRequestId = requestId;
		this._searchDebounceTimer = setTimeout(() => {
			this._searchDebounceTimer = null;
			void this._runSearch(searchQuery, requestId);
		}, 150);
	}

	private async _runSearch(searchQuery: string, requestId: number): Promise<void> {
		this.$isSearching.set(true);
		try {
			const [isSearchOk, , searchData] = toTuple(
				await specta.commands.searchCatalog({
					query: searchQuery,
					limit: 20,
					// Note: Search results only render icons; color extraction can take a few hundred ms, so blocked-target enrichment loads color later
					includeIcon: { type: 'lazy', includeColor: false }
				})
			);
			if (requestId !== this._latestSearchRequestId) return;
			if (isSearchOk) {
				this.$searchResults.set(searchData.map(toCatalogItem));
			}
		} finally {
			if (requestId === this._latestSearchRequestId) {
				this.$isSearching.set(false);
			}
		}
	}

	private _resetSearchState(): void {
		this._clearSearchDebounceTimer();
		this._latestSearchRequestId += 1;
		this.$searchQuery.set('');
		this.$searchResults.set([]);
		this.$isSearching.set(false);
	}

	private _clearSearchDebounceTimer(): void {
		if (this._searchDebounceTimer == null) {
			return;
		}

		clearTimeout(this._searchDebounceTimer);
		this._searchDebounceTimer = null;
	}
}

export type TCatalogItem =
	| { type: 'app'; app: specta.CatalogAppSearchResultDto }
	| { type: 'website'; website: specta.CatalogWebsiteSearchResultDto };

export type TCatalogPickerItemVisibleFn = (item: TCatalogItem) => boolean;

export type TCatalogPickerItemDisabledStateFn = (
	item: TCatalogItem
) => TCatalogPickerItemDisabledState | null;

export interface TCatalogPickerItemDisabledState {
	message: string;
}

export function getCatalogItemKey(item: TCatalogItem): string {
	return item.type === 'app' ? `app:${item.app.stableId}` : `website:${item.website.hostname}`;
}

export function isWebsiteCatalogItem(item: TCatalogItem): boolean {
	return item.type === 'website';
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
		? (item.app.name ?? item.app.bundleId ?? item.app.processPath ?? item.app.stableId)
		: (item.website.name ?? item.website.hostname);
}

export function getCatalogItemSublabel(item: TCatalogItem): string {
	return item.type === 'app'
		? (item.app.bundleId ?? item.app.processPath ?? item.app.stableId)
		: item.website.hostname;
}

function patchCatalogItemsWithAsset(
	items: TCatalogItem[],
	itemKey: string,
	asset: TCatalogItemAssetPatch
): TCatalogItem[] {
	return items.map((item) => {
		if (getCatalogItemKey(item) !== itemKey) {
			return item;
		}

		return item.type === 'app'
			? {
					...item,
					app: {
						...item.app,
						icon: asset.icon ?? item.app.icon,
						color: asset.color ?? item.app.color
					}
				}
			: {
					...item,
					website: {
						...item.website,
						icon: asset.icon ?? item.website.icon,
						color: asset.color ?? item.website.color
					}
				};
	});
}

interface TCatalogItemAssetPatch {
	icon?: string | null;
	color?: string | null;
}
