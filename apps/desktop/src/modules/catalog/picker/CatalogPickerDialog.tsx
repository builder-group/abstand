import { useCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import {
	Button,
	Dialog,
	DialogBody,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	XCircleIcon
} from '@/components';
import { cn } from '@/lib';
import { CatalogItemIcon } from './CatalogItemIcon';
import { CatalogItemTypeBadge } from './CatalogItemTypeBadge';
import {
	CatalogPickerCx,
	getCatalogItemKey,
	getCatalogItemLabel,
	getCatalogItemSublabel,
	type TCatalogItem
} from './CatalogPickerCx';
import { CatalogSearch } from './CatalogSearch';

const CatalogPickerDialog: React.FC<TCatalogPickerDialogProps> = (props) => {
	const { cx, title } = props;
	const isOpen = useFeatureState(cx.$isOpen);
	const selectedItems = useFeatureState(cx.$selectedItems);
	const selectedKeys = React.useMemo(
		() => new Set(selectedItems.map(getCatalogItemKey)),
		[selectedItems]
	);
	const isDirty = useFeatureState(cx.$isDirty);

	// MARK: - UI

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) cx.cancel();
			}}
		>
			<DialogContent className="flex h-120 max-w-xl flex-col">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>

				<DialogBody className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
					<CatalogSearch selectedKeys={selectedKeys} cx={cx} />

					<div className="flex min-h-0 flex-1 flex-col gap-2">
						<p className="text-base-600 ml-1 shrink-0 px-1 text-[13px] font-semibold">Selected</p>
						<div className="no-scrollbar bg-base-50/70 min-h-0 flex-1 overflow-y-auto rounded-xl">
							{selectedItems.length > 0 ? (
								selectedItems.map((item, i) => (
									<SelectedItemRow
										key={getCatalogItemKey(item)}
										item={item}
										cx={cx}
										isFirst={i === 0}
									/>
								))
							) : (
								<div className="text-base-400 flex h-full items-center justify-center text-sm">
									No targets selected
								</div>
							)}
						</div>
					</div>
				</DialogBody>

				<DialogFooter>
					<Button onClick={() => cx.cancel()}>Cancel</Button>
					<Button variant="primary" onClick={() => cx.confirm()} disabled={!isDirty}>
						Done
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

interface TCatalogPickerDialogProps {
	cx: CatalogPickerCx;
	title: string;
}

const SelectedItemRow: React.FC<TSelectedItemRowProps> = (props) => {
	const { item, cx, isFirst } = props;
	const key = getCatalogItemKey(item);
	const icon = useCompute(cx.$iconAssets, ({ value }) => value[key]);

	return (
		<div
			className={cn(
				'group/selected-item hover:bg-base-950/6 relative flex w-full items-center gap-3 px-4 py-2.5',
				!isFirst &&
					"before:bg-base-100 before:absolute before:inset-x-4 before:top-0 before:h-px before:content-['']"
			)}
		>
			<CatalogItemIcon item={item} icon={icon} />
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="text-base-950 truncate text-sm">{getCatalogItemLabel(item)}</span>
				<span className="text-base-400 truncate text-xs">{getCatalogItemSublabel(item)}</span>
			</div>
			<div className="flex shrink-0 items-center gap-0 transition-[gap] group-focus-within/selected-item:gap-2 group-hover/selected-item:gap-2">
				<CatalogItemTypeBadge item={item} />
				<Button
					variant="ghost"
					size="icon-sm"
					className="w-0 shrink-0 overflow-hidden transition-[width] group-focus-within/selected-item:w-7 group-hover/selected-item:w-7 focus-visible:w-7"
					aria-label={`Remove ${getCatalogItemLabel(item)}`}
					onClick={() => cx.remove(item)}
				>
					<XCircleIcon />
				</Button>
			</div>
		</div>
	);
};

interface TSelectedItemRowProps {
	item: TCatalogItem;
	cx: CatalogPickerCx;
	isFirst: boolean;
}

// MARK: - Hook

export function useCatalogPicker(options: TUseCatalogPickerOptions): TCatalogPickerHandle {
	const { onConfirm, title = 'Select Apps & Websites' } = options;

	const cx = React.useMemo(() => new CatalogPickerCx(onConfirm), [onConfirm]);

	React.useEffect(() => {
		return cx.mount();
	}, [cx]);

	const Dialog = React.useCallback(
		() => <CatalogPickerDialog cx={cx} title={title} />,
		[cx, title]
	);

	return { open: (items) => cx.open(items), Dialog };
}

export interface TUseCatalogPickerOptions {
	onConfirm: (items: TCatalogItem[]) => void;
	title?: string;
}

export interface TCatalogPickerHandle {
	open: (items: TCatalogItem[]) => void;
	Dialog: React.FC;
}
