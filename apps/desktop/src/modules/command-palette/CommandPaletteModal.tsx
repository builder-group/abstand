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
		(item: TCommandItem) => {
			void navigate({ to: item.to });
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
				if (activeItem != null) handleSelect(activeItem);
			}
		},
		[activeItem, handleSelect, handleNavigate]
	);

	// MARK: - Effects

	// Reset on open so a stale index from a previous session is never carried over
	useListener(
		cx.$isOpen,
		({ value }) => {
			if (value) setActiveIndex(0);
		},
		[]
	);

	// Keep the active item in view during keyboard navigation
	React.useEffect(() => {
		resultsRef.current
			?.querySelector<HTMLElement>('[aria-selected="true"]')
			?.scrollIntoView({ block: 'nearest' });
	}, [activeIndex]);

	// MARK: - UI

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-lg overflow-hidden p-0">
				<DialogTitle className="sr-only">Command Palette</DialogTitle>

				{/* Search */}
				<div className="border-base-100 has-[input:focus-visible]:border-primary flex items-center gap-2.5 border-b px-3 py-2.5">
					<SearchIcon className="text-base-400 size-4 shrink-0" />
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
						size="icon-sm"
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
							{filteredItems.map((item, index) => (
								<CommandPaletteItem
									key={item.id}
									item={item}
									isActive={index === activeIndex}
									onSelect={handleSelect}
									onPointerMove={() => setActiveIndex(index)}
								/>
							))}
						</div>
					) : (
						<p className="text-base-400 px-3 py-8 text-center text-sm">No results</p>
					)}
				</div>

				{/* Footer */}
				<div className="border-base-100 text-base-400 flex items-center gap-3 border-t px-3 py-2 text-xs">
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
				'flex w-full cursor-default items-center gap-3 rounded-lg px-2 py-2',
				'text-base-600 text-sm transition-colors',
				'select-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
				isActive && 'bg-base-950/6 text-base-950'
			)}
			onClick={() => onSelect(item)}
			onPointerMove={onPointerMove}
		>
			<span className="flex-1 truncate">{item.label}</span>
			<span className="text-base-400 shrink-0 text-xs">{item.group}</span>
		</div>
	);
};

interface TCommandPaletteItemProps {
	item: TCommandItem;
	isActive: boolean;
	onSelect: (item: TCommandItem) => void;
	onPointerMove: () => void;
}
