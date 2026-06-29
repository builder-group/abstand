import { useNavigate } from '@tanstack/react-router';
import { useFeatureState, useListener } from 'feature-react/state';
import { SearchIcon, XIcon } from 'lucide-react';
import React from 'react';
import { Button, Dialog, DialogContent, DialogTitle } from '@/components';
import { cn } from '@/lib';
import { useCommandPaletteCx, type TCommandItem } from './CommandPaletteCx';

export const CommandPaletteModal: React.FC = () => {
	const cx = useCommandPaletteCx();
	const navigate = useNavigate();

	const resultsRef = React.useRef<HTMLDivElement>(null);
	const isOpen = useFeatureState(cx.$isOpen);
	const query = useFeatureState(cx.$query);
	const items = useFeatureState(cx.$items);
	const filteredItems = React.useMemo(() => cx.filter(query, items), [cx, query, items]);
	const groupedItems = React.useMemo(() => groupCommandItems(filteredItems), [filteredItems]);

	// Single selection source shared by arrow keys and pointer movement
	const [activeIndex, setActiveIndex] = React.useState(0);
	const activeItem = filteredItems[activeIndex];

	// MARK: - Actions

	const handleOpenChange = React.useCallback(
		(open: boolean) => {
			if (!open) cx.close();
		},
		[cx]
	);

	const handleQueryChange = React.useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			cx.$query.set(e.target.value);
			setActiveIndex(0);
		},
		[cx]
	);

	const handleSelect = React.useCallback(
		async (item: TCommandItem) => {
			switch (item.type) {
				case 'navigation':
					void navigate({ to: item.to, params: item.params });
					break;
				case 'action':
					await item.run();
					break;
			}

			cx.close();
		},
		[cx, navigate]
	);

	const handleNavigate = React.useCallback(
		(direction: 'up' | 'down') => {
			if (filteredItems.length === 0) return;
			setActiveIndex((index) =>
				direction === 'down'
					? (index + 1) % filteredItems.length
					: (index - 1 + filteredItems.length) % filteredItems.length
			);
		},
		[filteredItems.length]
	);

	const handleInputKeyDown = React.useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				handleNavigate('down');
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				handleNavigate('up');
			} else if (e.key === 'Enter') {
				e.preventDefault();
				if (activeItem != null) void handleSelect(activeItem);
			}
		},
		[activeItem, handleSelect, handleNavigate]
	);

	// MARK: - Effects

	// Reset on open so a stale index from a previous session is never carried over
	useListener(cx.$isOpen, ({ value }) => {
		if (value) setActiveIndex(0);
	});

	// Keep the active item in view during keyboard navigation
	React.useEffect(() => {
		resultsRef.current
			?.querySelector<HTMLElement>('[aria-selected="true"]')
			?.scrollIntoView({ block: 'nearest' });
	}, [activeIndex]);

	// MARK: - UI

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogContent className="top-[20vh] max-w-lg translate-y-0 overflow-hidden p-0">
				<DialogTitle className="sr-only">Command Palette</DialogTitle>

				{/* Search */}
				<div className="border-base-100 has-[input:focus-visible]:border-primary flex items-center gap-2 border-b px-3 py-2">
					<SearchIcon className="text-base-400 size-3.5 shrink-0" />
					<input
						autoFocus
						value={query}
						onChange={handleQueryChange}
						onKeyDown={handleInputKeyDown}
						role="combobox"
						aria-label="Search commands"
						aria-autocomplete="list"
						aria-controls={filteredItems.length > 0 ? 'command-palette-results' : undefined}
						autoComplete="off"
						autoCorrect="off"
						spellCheck={false}
						aria-expanded={true}
						aria-activedescendant={
							activeItem != null ? `command-palette-option-${activeItem.id}` : undefined
						}
						placeholder="Search…"
						className="text-base-950 placeholder:text-base-400 flex-1 bg-transparent text-sm outline-none"
					/>
					<Button
						variant="ghost"
						size="icon-xs"
						aria-label="Close command palette"
						onClick={() => cx.close()}
					>
						<XIcon />
					</Button>
				</div>

				{/* Results */}
				<div ref={resultsRef} className="max-h-72 overflow-y-auto px-1 py-1">
					{filteredItems.length > 0 ? (
						<div id="command-palette-results" role="listbox" aria-label="Command results">
							{groupedItems.map((group) => (
								<div key={group.label} className="py-1 first:pt-0">
									<div className="text-base-400 px-2 pt-2 pb-1 text-xs font-medium">
										{group.label}
									</div>
									{group.items.map(({ item, index }) => (
										<CommandPaletteItem
											key={item.id}
											item={item}
											isActive={index === activeIndex}
											onSelect={handleSelect}
											onPointerMove={() => setActiveIndex(index)}
										/>
									))}
								</div>
							))}
						</div>
					) : (
						<p className="text-base-400 px-3 py-8 text-center text-sm">No results</p>
					)}
				</div>

				{/* Footer */}
				<div className="border-base-100 text-base-400 flex items-center gap-2.5 border-t px-3 py-1.5 text-xs">
					<span className="flex items-center gap-1">
						<span>↑↓</span>
						<span>to navigate</span>
					</span>
					<span className="flex items-center gap-1">
						<span className="mt-1">↵</span>
						<span>to select</span>
					</span>
				</div>
			</DialogContent>
		</Dialog>
	);
};

const CommandPaletteItem: React.FC<TCommandPaletteItemProps> = (props) => {
	const { item, isActive, onSelect, onPointerMove } = props;

	return (
		<div
			id={`command-palette-option-${item.id}`}
			role="option"
			aria-selected={isActive}
			className={cn(
				'flex w-full cursor-default items-center gap-2 rounded-lg px-2 py-1.25',
				'text-base-600 text-sm transition-colors',
				'select-none',
				isActive && 'bg-base-950/6 text-base-950'
			)}
			onClick={() => void onSelect(item)}
			onPointerMove={onPointerMove}
		>
			<span className="min-w-0 flex-1 truncate">{item.label}</span>
		</div>
	);
};

interface TCommandPaletteItemProps {
	item: TCommandItem;
	isActive: boolean;
	onSelect: (item: TCommandItem) => Promise<void>;
	onPointerMove: () => void;
}

function groupCommandItems(items: TCommandItem[]): TCommandGroup[] {
	const groups: TCommandGroup[] = [];
	const groupsByLabel = new Map<string, TCommandGroup>();

	items.forEach((item, index) => {
		const existingGroup = groupsByLabel.get(item.group);
		if (existingGroup != null) {
			existingGroup.items.push({ item, index });
			return;
		}

		const group = { label: item.group, items: [{ item, index }] };
		groupsByLabel.set(item.group, group);
		groups.push(group);
	});

	return groups;
}

interface TCommandGroup {
	label: string;
	items: TIndexedCommandItem[];
}

interface TIndexedCommandItem {
	item: TCommandItem;
	index: number;
}
