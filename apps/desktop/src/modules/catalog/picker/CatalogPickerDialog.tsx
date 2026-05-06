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
import { SettingsGroup, SettingsRowFrame } from '@/modules/settings';
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
			<DialogContent className="max-w-xl">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>

				<DialogBody className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
					<CatalogSearch selectedKeys={selectedKeys} cx={cx} />

					<SettingsGroup title="Selected" contentClassName="h-75 overflow-y-auto">
						{selectedItems.length > 0 ? (
							selectedItems.map((item) => (
								<SelectedItemRow key={getCatalogItemKey(item)} item={item} cx={cx} />
							))
						) : (
							<div className="text-base-400 flex h-full items-center justify-center text-sm">
								No targets selected
							</div>
						)}
					</SettingsGroup>
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
	const { item, cx } = props;
	const key = getCatalogItemKey(item);
	const icon = useCompute(cx.$iconAssets, ({ value }) => value[key]);

	return (
		<SettingsRowFrame className="group/selected-item relative gap-1.5">
			<CatalogItemIcon item={item} icon={icon} />
			<div className="flex min-w-0 flex-1 flex-col">
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
		</SettingsRowFrame>
	);
};

interface TSelectedItemRowProps {
	item: TCatalogItem;
	cx: CatalogPickerCx;
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

	return { open: (items) => cx.open(items), Dialog, cx };
}

export interface TUseCatalogPickerOptions {
	onConfirm: (items: TCatalogItem[]) => void;
	title?: string;
}

export interface TCatalogPickerHandle {
	open: (items: TCatalogItem[]) => void;
	Dialog: React.FC;
	cx: CatalogPickerCx;
}
