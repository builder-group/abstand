import { useEventCallback, useFeatureState } from 'feature-react/state';
import React from 'react';
import {
	Button,
	Dialog,
	DialogBody,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	HelpPopover,
	InlineCode,
	XCircleIcon
} from '@/components';
import { SettingsGroup, SettingsRowFrame } from '@/modules/settings';
import { CatalogItemIcon } from './CatalogItemIcon';
import { CatalogItemBadges, CatalogItemSublabel } from './CatalogItemMeta';
import {
	CatalogPickerCx,
	getCatalogItemKey,
	getCatalogItemLabel,
	type TCatalogItem,
	type TCatalogPickerItemDisabledStateFn,
	type TCatalogPickerItemVisibleFn
} from './CatalogPickerCx';
import { CatalogSearch } from './CatalogSearch';

const CatalogPickerDialog: React.FC<TCatalogPickerDialogProps> = (props) => {
	const { cx, title, searchPlaceholder, searchStatus, isItemVisible, getItemDisabledState } = props;
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
					<div className="flex items-center gap-1.5">
						<DialogTitle>{title}</DialogTitle>
						<HelpPopover
							ariaLabel="About selecting targets"
							side="bottom"
							description={
								<>
									Search for apps and websites, or type a website URL. Use{' '}
									<InlineCode className="text-warning bg-base-50/10 font-semibold">*</InlineCode> as
									a wildcard in a path, such as{' '}
									<InlineCode className="text-base-50 bg-base-50/10">
										youtube.com/@<span className="text-warning font-semibold">*</span>
									</InlineCode>{' '}
									for channel pages.
								</>
							}
						/>
					</div>
				</DialogHeader>

				<DialogBody className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
					<CatalogSearch
						cx={cx}
						placeholder={searchPlaceholder}
						status={searchStatus}
						selectedKeys={selectedKeys}
						isItemVisible={isItemVisible}
						getItemDisabledState={getItemDisabledState}
					/>

					<SettingsGroup title="Selected" contentClassName="h-77 overflow-y-auto">
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
	searchPlaceholder: string;
	searchStatus: string;
	isItemVisible?: TCatalogPickerItemVisibleFn;
	getItemDisabledState?: TCatalogPickerItemDisabledStateFn;
}

const SelectedItemRow: React.FC<TSelectedItemRowProps> = (props) => {
	const { item, cx } = props;

	return (
		<SettingsRowFrame className="group/selected-item relative gap-1.5" variant="compact">
			<CatalogItemIcon item={item} />
			<div className="flex min-w-0 flex-1 flex-col">
				<span className="text-base-950 truncate text-sm">{getCatalogItemLabel(item)}</span>
				<CatalogItemSublabel item={item} />
			</div>
			<div className="flex shrink-0 items-center gap-0 transition-[gap] group-focus-within/selected-item:gap-2 group-hover/selected-item:gap-2">
				<CatalogItemBadges item={item} />
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
	const {
		onConfirm,
		title = 'Select Apps & Websites',
		searchPlaceholder = 'Search apps and websites…',
		searchStatus = 'Select apps & websites',
		isItemVisible,
		getItemDisabledState
	} = options;

	const handleConfirm = useEventCallback(onConfirm);
	const cx = React.useMemo(() => new CatalogPickerCx(handleConfirm), [handleConfirm]);

	React.useEffect(() => {
		return cx.mount();
	}, [cx]);

	return {
		open: React.useCallback((items: TCatalogItem[]) => cx.open(items), [cx]),
		dialog: (
			<CatalogPickerDialog
				cx={cx}
				title={title}
				searchPlaceholder={searchPlaceholder}
				searchStatus={searchStatus}
				isItemVisible={isItemVisible}
				getItemDisabledState={getItemDisabledState}
			/>
		),
		cx
	};
}

export interface TUseCatalogPickerOptions {
	onConfirm: (items: TCatalogItem[]) => void;
	title?: string;
	searchPlaceholder?: string;
	searchStatus?: string;
	isItemVisible?: TCatalogPickerItemVisibleFn;
	getItemDisabledState?: TCatalogPickerItemDisabledStateFn;
}

export interface TCatalogPickerHandle {
	open: (items: TCatalogItem[]) => void;
	dialog: React.ReactElement;
	cx: CatalogPickerCx;
}
