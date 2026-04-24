import { useNavigate } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import { SearchIcon } from 'lucide-react';
import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components';
import { cn } from '@/lib';
import { useCommandPaletteCx, type TCommandItem } from './CommandPaletteCx';

export const CommandPaletteModal: React.FC = () => {
	const cx = useCommandPaletteCx();
	const navigate = useNavigate();

	const inputRef = React.useRef<HTMLInputElement>(null);
	const resultsRef = React.useRef<HTMLDivElement>(null);

	// Prevents handleInputFocus from resetting activeIndex on programmatic focus calls
	const skipIndexResetRef = React.useRef(false);

	const isOpen = useFeatureState(cx.$isOpen);
	const query = useFeatureState(cx.$query);
	const items = useFeatureState(cx.$items);

	// Single selection source shared by arrow keys, Tab focus, and pointer movement
	const [activeIndex, setActiveIndex] = React.useState(0);

	const filteredItems = React.useMemo(() => cx.filter(query, items), [cx, query, items]);

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
			setActiveIndex((i) =>
				direction === 'down'
					? (i + 1) % filteredItems.length
					: (i - 1 + filteredItems.length) % filteredItems.length
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
				const item = filteredItems[activeIndex];
				if (item != null) handleSelect(item);
			}
		},
		[filteredItems, activeIndex, handleSelect, handleNavigate]
	);

	const handleInputFocus = React.useCallback(() => {
		// Skip if focus was returned by navigation; activeIndex is already correct
		if (skipIndexResetRef.current) {
			skipIndexResetRef.current = false;
			return;
		}

		setActiveIndex(0);
	}, []);

	const handleItemPointerMove = React.useCallback(
		(index: number) => {
			if (index === activeIndex) return;
			setActiveIndex(index);
			if (resultsRef.current?.contains(document.activeElement)) {
				skipIndexResetRef.current = true;
				inputRef.current?.focus();
			}
		},
		[activeIndex]
	);

	const handleItemKeyDown = React.useCallback(
		(e: React.KeyboardEvent<HTMLButtonElement>) => {
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				handleNavigate('down');
				skipIndexResetRef.current = true;
				inputRef.current?.focus();
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				handleNavigate('up');
				skipIndexResetRef.current = true;
				inputRef.current?.focus();
			}
		},
		[handleNavigate]
	);

	// MARK: - Effects

	// Reset to avoid a stale index pointing past the end after filtering
	React.useEffect(() => {
		setActiveIndex(0);
	}, [filteredItems]);

	// Keep the active item in view during keyboard navigation
	React.useEffect(() => {
		resultsRef.current
			?.querySelector<HTMLElement>('[data-active="true"]')
			?.scrollIntoView({ block: 'nearest' });
	}, [activeIndex]);

	// MARK: - UI

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-lg overflow-hidden p-0">
				<DialogTitle className="sr-only">Command Palette</DialogTitle>

				{/* Search */}
				<div className="border-base-100 has-focus-visible:border-primary flex items-center gap-2.5 border-b px-3 py-2.5">
					<SearchIcon className="text-base-400 size-4 shrink-0" />
					<input
						ref={inputRef}
						autoFocus
						value={query}
						onChange={handleQueryChange}
						onKeyDown={handleInputKeyDown}
						onFocus={handleInputFocus}
						placeholder="Search…"
						className="text-base-950 placeholder:text-base-400 flex-1 bg-transparent text-sm outline-none"
					/>
				</div>

				{/* Results */}
				<div ref={resultsRef} className="max-h-72 overflow-y-auto px-1 py-1">
					{filteredItems.length === 0 ? (
						<p className="text-base-400 px-3 py-8 text-center text-sm">No results</p>
					) : (
						filteredItems.map((item, index) => (
							<CommandPaletteItem
								key={item.id}
								item={item}
								isActive={index === activeIndex}
								onSelect={handleSelect}
								onPointerMove={() => handleItemPointerMove(index)}
								onFocus={() => setActiveIndex(index)}
								onKeyDown={handleItemKeyDown}
							/>
						))
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
};

const CommandPaletteItem: React.FC<TCommandPaletteItemProps> = (props) => {
	const { item, isActive, onSelect, onPointerMove, onFocus, onKeyDown } = props;

	return (
		<button
			data-active={isActive}
			className={cn(
				'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left',
				'text-base-600 focus-ring text-sm transition-colors',
				'select-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
				isActive && 'bg-base-950/6 text-base-950'
			)}
			onClick={() => onSelect(item)}
			onPointerMove={onPointerMove}
			onFocus={onFocus}
			onKeyDown={onKeyDown}
		>
			<span className="flex-1 truncate">{item.label}</span>
			<span className="text-base-400 shrink-0 text-xs">{item.group}</span>
		</button>
	);
};

interface TCommandPaletteItemProps {
	item: TCommandItem;
	isActive: boolean;
	onSelect: (item: TCommandItem) => void;
	onPointerMove: () => void;
	onFocus: () => void;
	onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
}
