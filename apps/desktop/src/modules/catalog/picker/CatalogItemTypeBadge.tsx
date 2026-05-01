import React from 'react';
import { Badge } from '@/components';
import type { TCatalogItem } from './CatalogPickerCx';

export const CatalogItemTypeBadge: React.FC<TCatalogItemTypeBadgeProps> = ({ item }) => (
	<Badge
		size="sm"
		className={
			item.type === 'app' ? 'bg-blue-500/10 text-blue-600' : 'bg-violet-500/10 text-violet-600'
		}
	>
		{item.type === 'app' ? 'app' : 'website'}
	</Badge>
);

interface TCatalogItemTypeBadgeProps {
	item: TCatalogItem;
}
