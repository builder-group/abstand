import { useCompute } from 'feature-react/state';
import React from 'react';
import {
	Badge,
	CheckIcon,
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
	ComboboxStatus,
	SearchIcon,
	useComboboxAnchor
} from '@/components';
import { specta } from '@/environment';
import { useDelayedValue } from '@/hooks';
import { toTuple } from '@/lib';
import { CatalogItemIcon } from './CatalogItemIcon';
import { CatalogItemTypeBadge } from './CatalogItemTypeBadge';
import {
	getCatalogItemKey,
	getCatalogItemLabel,
	getCatalogItemSublabel,
	toCatalogItem,
	type CatalogPickerCx,
	type TCatalogItem
} from './CatalogPickerCx';

export const CatalogSearch: React.FC<TCatalogSearchProps> = (props) => {
	const { selectedKeys, cx } = props;
	const anchorRef = useComboboxAnchor();

	const [query, setQuery] = React.useState('');
	const trimmedQuery = React.useMemo(() => query.trim(), [query]);

	const [searchResults, setSearchResults] = React.useState<specta.CatalogSearchResultDto[]>([]);
	const resultItems = React.useMemo(() => searchResults.map(toCatalogItem), [searchResults]);

	const [isLoading, setIsLoading] = React.useState(false);
	const isLoadingVisible = useDelayedValue(isLoading, (nextValue) => (nextValue ? 200 : 0));

	// MARK: - Actions

	const handleInputChange = React.useCallback((value: string) => {
		setQuery(value);
	}, []);

	// MARK: - Effects

	// Debounce search and cancel stale requests on each query change
	React.useEffect(() => {
		if (trimmedQuery.length === 0) {
			setSearchResults([]);
			setIsLoading(false);
			return;
		}

		let isActive = true;

		const timer = setTimeout(async () => {
			setIsLoading(true);
			try {
				const [isSearchOk, , searchData] = toTuple(
					await specta.commands.searchCatalog({
						query: trimmedQuery,
						limit: 20,
						includeIcon: { type: 'lazy', includeColor: false }
					})
				);
				if (!isActive) return;
				if (isSearchOk) {
					setSearchResults(searchData);
				}
			} finally {
				if (isActive) {
					setIsLoading(false);
				}
			}
		}, 150);

		return () => {
			isActive = false;
			clearTimeout(timer);
		};
	}, [trimmedQuery]);

	// MARK: - UI

	return (
		<Combobox
			multiple
			autoHighlight="always"
			filter={null}
			items={resultItems}
			// Note: returning '' clears the input display after an item is pressed
			itemToStringValue={() => ''}
			onInputValueChange={handleInputChange}
		>
			<ComboboxInput
				ref={anchorRef}
				autoFocus
				showTrigger={false}
				leading={<SearchIcon className="text-base-400 size-4" />}
				placeholder="Search apps and websites…"
			/>

			{trimmedQuery.length > 0 && (
				<ComboboxContent
					anchor={anchorRef}
					className="w-(--anchor-width) max-w-(--anchor-width) min-w-0"
				>
					<ComboboxStatus>
						{isLoadingVisible ? 'Searching…' : 'Select apps & websites'}
					</ComboboxStatus>

					<ComboboxList>
						{resultItems.map((item) => {
							const key = getCatalogItemKey(item);
							return (
								<CatalogSearchItem
									key={key}
									item={item}
									cx={cx}
									isSelected={selectedKeys.has(key)}
								/>
							);
						})}

						<ComboboxEmpty>No results</ComboboxEmpty>
					</ComboboxList>
				</ComboboxContent>
			)}
		</Combobox>
	);
};

interface TCatalogSearchProps {
	selectedKeys: Set<string>;
	cx: CatalogPickerCx;
}

const CatalogSearchItem: React.FC<TCatalogSearchItemProps> = (props) => {
	const { item, cx, isSelected } = props;
	const key = getCatalogItemKey(item);
	const icon = useCompute(cx.$iconAssets, ({ value }) => value[key]);

	return (
		<ComboboxItem key={key} value={item} onClick={() => cx.toggle(item)}>
			<CatalogItemIcon item={item} icon={icon} isSelected={isSelected} />
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="truncate text-sm">{getCatalogItemLabel(item)}</span>
				<span className="text-base-400 truncate text-xs">{getCatalogItemSublabel(item)}</span>
			</div>
			{isSelected && (
				<Badge size="sm" className="bg-green-500/10 text-green-600">
					<CheckIcon className="size-3" />
					added
				</Badge>
			)}
			<CatalogItemTypeBadge item={item} />
		</ComboboxItem>
	);
};

interface TCatalogSearchItemProps {
	item: TCatalogItem;
	cx: CatalogPickerCx;
	isSelected: boolean;
}
