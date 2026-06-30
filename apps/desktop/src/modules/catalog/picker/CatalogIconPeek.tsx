import React from 'react';
import { Tooltip } from '@/components';
import { cn } from '@/lib';
import { getCatalogItemKey, getCatalogItemLabel, type TCatalogItem } from './CatalogPickerCx';

export const CatalogIconPeek: React.FC<TCatalogIconPeekProps> = (props) => {
	const { items, limit = 4, className } = props;
	const previewIcons = React.useMemo(() => {
		const result: TCatalogPreviewIcon[] = [];
		const labels = new Set<string>();
		for (const item of items) {
			const key = getCatalogItemKey(item);
			const icon = item.icon;
			if (icon == null) {
				continue;
			}

			const label = getCatalogItemLabel(item);
			const normalizedLabel = label.trim().toLowerCase();
			const labelKey = `${item.type}:${normalizedLabel}`;
			if (labels.has(labelKey)) {
				continue;
			}

			labels.add(labelKey);
			result.push({ key, icon, item, label });
			if (result.length >= limit) {
				break;
			}
		}
		return result;
	}, [items, limit]);

	// MARK: - UI

	if (!previewIcons.length) {
		return null;
	}

	return (
		<span className={cn('flex -space-x-1.5 *:transition-[margin] hover:space-x-0.5', className)}>
			{previewIcons.map((previewIcon) => (
				<Tooltip key={previewIcon.key} content={previewIcon.label}>
					<span className="bg-base-0 ring-base-950/5 flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-md ring-1">
						<img
							src={previewIcon.icon}
							alt=""
							className={cn(
								'object-contain',
								previewIcon.item.type === 'app' && 'size-4',
								previewIcon.item.type === 'website' && 'size-3.5'
							)}
						/>
					</span>
				</Tooltip>
			))}
		</span>
	);
};

interface TCatalogIconPeekProps {
	items: TCatalogItem[];
	limit?: number;
	className?: string;
}

interface TCatalogPreviewIcon {
	key: string;
	icon: string;
	item: TCatalogItem;
	label: string;
}
