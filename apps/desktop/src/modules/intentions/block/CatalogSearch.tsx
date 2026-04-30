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
import { toTuple } from '@/lib';
import {
	getBlockTargetKey,
	getBlockTargetLabel,
	getBlockTargetSublabel,
	toBlockTarget,
	type TBlockTarget
} from './block-target';
import { BlockTargetIcon } from './BlockTargetIcon';
import type { BlockTargetsDialogCx } from './BlockTargetsDialog';
import { BlockTargetTypeBadge } from './BlockTargetTypeBadge';

export const CatalogSearch: React.FC<TCatalogSearchProps> = (props) => {
	const { cx } = props;
	const anchorRef = useComboboxAnchor();

	const [query, setQuery] = React.useState('');
	const trimmedQuery = React.useMemo(() => query.trim(), [query]);

	const [searchResults, setSearchResults] = React.useState<specta.CatalogSearchResultDto[]>([]);
	const [isLoading, setIsLoading] = React.useState(false);
	const resultTargets = React.useMemo(() => searchResults.map(toBlockTarget), [searchResults]);
	const selectedKeys = useCompute(cx.$selectedTargets, ({ value }) => {
		return new Set(value.map(getBlockTargetKey));
	});

	// MARK: - Actions

	const handleInputChange = React.useCallback((value: string) => {
		setQuery(value);
	}, []);

	// MARK: - Effects

	// Debounce catalog searches slightly so fast typing does not thrash the backend
	React.useEffect(() => {
		if (trimmedQuery.length === 0) {
			setSearchResults([]);
			setIsLoading(false);
			void cx.cancelActiveCatalogSearchSession();
			return;
		}

		let isActive = true;

		const timer = setTimeout(async () => {
			setIsLoading(true);
			try {
				await cx.cancelActiveCatalogSearchSession();

				const [isSearchOk, , searchResponse] = toTuple(
					await specta.commands.searchCatalog({
						query: trimmedQuery,
						limit: 20,
						iconMode: 'lazy'
					})
				);
				if (!isSearchOk) {
					return;
				}

				const { lazySessionId, results } = searchResponse;
				if (!isActive) {
					if (lazySessionId != null) {
						await specta.commands.cancelCatalogSearchSession({ sessionId: lazySessionId });
					}
					return;
				}

				cx.setActiveCatalogSearchSessionId(lazySessionId);
				setSearchResults(results);
			} finally {
				if (isActive) {
					setIsLoading(false);
				}
			}
		}, 100);

		return () => {
			isActive = false;
			clearTimeout(timer);
		};
	}, [cx, trimmedQuery]);

	// MARK: - UI

	return (
		<Combobox
			multiple
			filter={null}
			items={resultTargets}
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
					<ComboboxStatus>{isLoading ? 'Searching…' : 'Select apps & websites'}</ComboboxStatus>

					<ComboboxList>
						{resultTargets.map((target) => {
							const targetKey = getBlockTargetKey(target);
							const isSelected = selectedKeys.has(targetKey);

							return (
								<CatalogSearchResultRow
									key={targetKey}
									cx={cx}
									target={target}
									isSelected={isSelected}
									onToggle={() => cx.toggle(target)}
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

export interface TCatalogSearchProps {
	cx: BlockTargetsDialogCx;
}

const CatalogSearchResultRow: React.FC<TCatalogSearchResultRowProps> = (props) => {
	const { cx, target, isSelected, onToggle } = props;
	const icon = useCompute(cx.$iconAssets, ({ value }) => value[getBlockTargetKey(target)]?.icon);

	return (
		<ComboboxItem value={target} onClick={onToggle}>
			<BlockTargetIcon target={target} icon={icon} />
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="truncate text-sm">{getBlockTargetLabel(target)}</span>
				<span className="text-base-400 truncate text-xs">{getBlockTargetSublabel(target)}</span>
			</div>
			{isSelected && (
				<Badge size="sm" className="bg-green-500/10 text-green-600">
					<CheckIcon className="size-3" />
					added
				</Badge>
			)}
			<BlockTargetTypeBadge target={target} />
		</ComboboxItem>
	);
};

interface TCatalogSearchResultRowProps {
	cx: BlockTargetsDialogCx;
	target: TBlockTarget;
	isSelected: boolean;
	onToggle: () => void;
}
