import React from 'react';
import { AppWindowIcon, GlobeIcon, MinusIcon, PlusIcon } from '@/components';
import { cn } from '@/lib';
import type { TCatalogItem } from './CatalogPickerCx';

export const CatalogItemIcon: React.FC<TCatalogItemIconProps> = (props) => {
	const {
		item,
		icon = item.type === 'app' ? item.app.icon : item.website.icon,
		isSelected = false
	} = props;

	return (
		<span
			className={cn(
				'relative flex size-7 shrink-0 items-center justify-center rounded-lg',
				icon != null && 'bg-base-0 ring-base-950/5 overflow-hidden ring-1',
				icon == null && item.type === 'app' && 'bg-primary/10 text-primary',
				icon == null && item.type === 'website' && 'bg-secondary/10 text-secondary'
			)}
		>
			{icon != null ? (
				<img
					src={icon}
					alt=""
					className={cn(
						'object-contain',
						item.type === 'app' && 'size-6',
						item.type === 'website' && 'size-5'
					)}
				/>
			) : item.type === 'app' ? (
				<AppWindowIcon className="size-3.5" />
			) : (
				<GlobeIcon className="size-3.5" />
			)}
			<CatalogItemActionIndicator isSelected={isSelected} />
		</span>
	);
};

interface TCatalogItemIconProps {
	item: TCatalogItem;
	icon?: string | null;
	isSelected?: boolean;
}

const CatalogItemActionIndicator: React.FC<TCatalogItemActionIndicatorProps> = (props) => {
	const { isSelected } = props;

	return (
		<span className="bg-base-950 text-base-0 ring-base-0 absolute right-0.5 bottom-0.5 flex size-3 items-center justify-center rounded-full opacity-0 ring-2 transition-opacity group-data-highlighted/combobox-item:opacity-100">
			{isSelected ? (
				<MinusIcon className="size-2.5" strokeWidth={3} />
			) : (
				<PlusIcon className="size-2.5" strokeWidth={3} />
			)}
		</span>
	);
};

interface TCatalogItemActionIndicatorProps {
	isSelected: boolean;
}
