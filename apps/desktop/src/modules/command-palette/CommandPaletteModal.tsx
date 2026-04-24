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
	const isOpen = useFeatureState(cx.$isOpen);
	const query = useFeatureState(cx.$query);
	const items = useFeatureState(cx.$items);

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

	const handleInputKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			resultsRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
		}
	}, []);

	const handleResultsKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
		const buttons = [...(resultsRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
		const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			(buttons[currentIndex + 1] ?? buttons[0])?.focus();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (currentIndex > 0) {
				buttons[currentIndex - 1]?.focus();
			} else {
				inputRef.current?.focus();
			}
		}
	}, []);

	const handleSelect = React.useCallback(
		(item: TCommandItem) => {
			void navigate({ to: item.to });
			cx.close();
		},
		[cx, navigate]
	);

	// MARK: - UI

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-lg overflow-hidden p-0">
				<DialogTitle className="sr-only">Command Palette</DialogTitle>

				{/* Search */}
				<div className="border-base-100 flex items-center gap-2.5 border-b px-3 py-2.5">
					<SearchIcon className="text-base-400 size-4 shrink-0" />
					<input
						ref={inputRef}
						autoFocus
						value={query}
						onChange={handleQueryChange}
						onKeyDown={handleInputKeyDown}
						placeholder="Search…"
						className="text-base-950 placeholder:text-base-400 flex-1 bg-transparent text-sm outline-none"
					/>
				</div>

				{/* Results */}
				<div
					ref={resultsRef}
					onKeyDown={handleResultsKeyDown}
					className="max-h-72 overflow-y-auto px-1 py-1"
				>
					{filteredItems.length === 0 ? (
						<p className="text-base-400 px-3 py-8 text-center text-sm">No results</p>
					) : (
						filteredItems.map((item) => (
							<CommandPaletteItem key={item.id} item={item} onSelect={handleSelect} />
						))
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
};

const CommandPaletteItem: React.FC<TCommandPaletteItemProps> = (props) => {
	const { item, onSelect } = props;

	return (
		<button
			className={cn(
				'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left',
				'text-base-600 text-sm transition-colors',
				'border border-transparent',
				'hover:bg-base-950/6 hover:text-base-950',
				'focus-ring',
				'select-none [&_svg]:pointer-events-none [&_svg]:shrink-0'
			)}
			onClick={() => onSelect(item)}
		>
			<span className="flex-1 truncate">{item.label}</span>
			<span className="text-base-400 shrink-0 text-xs">{item.group}</span>
		</button>
	);
};

interface TCommandPaletteItemProps {
	item: TCommandItem;
	onSelect: (item: TCommandItem) => void;
}
