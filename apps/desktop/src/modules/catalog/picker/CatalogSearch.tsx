import { useCompute, useFeatureState } from 'feature-react/state';
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
import { useDelayedValue } from '@/hooks';
import { CatalogItemIcon } from './CatalogItemIcon';
import { CatalogItemTypeBadge } from './CatalogItemTypeBadge';
import {
	getCatalogItemKey,
	getCatalogItemLabel,
	getCatalogItemSublabel,
	type CatalogPickerCx,
	type TCatalogItem,
	type TCatalogPickerItemDisabledState,
	type TCatalogPickerItemDisabledStateFn,
	type TCatalogPickerItemVisibleFn
} from './CatalogPickerCx';

export const CatalogSearch: React.FC<TCatalogSearchProps> = (props) => {
	const { cx, placeholder, status, selectedKeys, isItemVisible, getItemDisabledState } = props;
	const anchorRef = useComboboxAnchor();

	const searchQuery = useFeatureState(cx.$searchQuery);
	const trimmedSearchQuery = searchQuery.trim();
	const resultItems = useCompute(
		cx.$searchResults,
		(resultItems) => (isItemVisible == null ? resultItems : resultItems.filter(isItemVisible)),
		[isItemVisible]
	);
	const isSearching = useFeatureState(cx.$isSearching);
	const isSearchingVisible = useDelayedValue(isSearching, (nextValue) => (nextValue ? 200 : 0));

	// MARK: - UI

	return (
		<Combobox
			multiple
			autoHighlight="always"
			filter={null}
			items={resultItems}
			inputValue={searchQuery}
			// Note: returning '' clears the input display after an item is pressed
			itemToStringValue={() => ''}
			onInputValueChange={(value) => cx.setSearchQuery(value)}
		>
			<ComboboxInput
				ref={anchorRef}
				autoFocus
				showTrigger={false}
				leading={<SearchIcon className="text-base-400" />}
				placeholder={placeholder}
			/>

			{trimmedSearchQuery.length > 0 && (
				<ComboboxContent
					anchor={anchorRef}
					className="w-(--anchor-width) max-w-(--anchor-width) min-w-0"
				>
					<ComboboxStatus>{isSearchingVisible ? 'Searching…' : status}</ComboboxStatus>

					<ComboboxList>
						{resultItems.map((item) => {
							const key = getCatalogItemKey(item);
							const isSelected = selectedKeys.has(key);
							const disabledState = isSelected ? null : (getItemDisabledState?.(item) ?? null);
							return (
								<CatalogSearchItem
									key={key}
									item={item}
									cx={cx}
									isSelected={isSelected}
									disabledState={disabledState}
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
	cx: CatalogPickerCx;
	placeholder: string;
	status: string;
	selectedKeys: Set<string>;
	isItemVisible?: TCatalogPickerItemVisibleFn;
	getItemDisabledState?: TCatalogPickerItemDisabledStateFn;
}

const CatalogSearchItem: React.FC<TCatalogSearchItemProps> = (props) => {
	const { item, cx, isSelected, disabledState } = props;
	const isDisabled = disabledState != null;

	return (
		<ComboboxItem value={item} disabled={isDisabled} onClick={() => cx.toggle(item)}>
			<CatalogItemIcon item={item} isSelected={isSelected} />
			<div className="flex min-w-0 flex-1 flex-col">
				<span className="truncate">{getCatalogItemLabel(item)}</span>
				<span className="text-base-400 truncate text-xs">{getCatalogItemSublabel(item)}</span>
			</div>
			{isSelected && (
				<Badge variant="success">
					<CheckIcon className="size-3" />
					added
				</Badge>
			)}
			{disabledState != null && <Badge>{disabledState.message}</Badge>}
			<CatalogItemTypeBadge item={item} />
		</ComboboxItem>
	);
};

interface TCatalogSearchItemProps {
	item: TCatalogItem;
	cx: CatalogPickerCx;
	isSelected: boolean;
	disabledState: TCatalogPickerItemDisabledState | null;
}
