import React from 'react';
import { Badge } from '@/components';
import type { TCatalogItem } from './CatalogPickerCx';

export const CatalogItemTypeBadge: React.FC<TCatalogItemTypeBadgeProps> = (props) => {
	const { item } = props;

	return (
		<Badge size="sm" variant={item.type === 'app' ? 'default' : 'secondary'}>
			{item.type === 'app' ? 'app' : 'website'}
		</Badge>
	);
};

interface TCatalogItemTypeBadgeProps {
	item: TCatalogItem;
}
