import React from 'react';
import { Badge } from '@/components';
import type { TCatalogItem } from './CatalogPickerCx';

export const CatalogItemTypeBadge: React.FC<TCatalogItemTypeBadgeProps> = (props) => {
	const { item } = props;

	return (
		<Badge variant={item.type === 'app' ? 'primary' : 'secondary'}>
			{item.type === 'app' ? 'app' : 'website'}
		</Badge>
	);
};

interface TCatalogItemTypeBadgeProps {
	item: TCatalogItem;
}
