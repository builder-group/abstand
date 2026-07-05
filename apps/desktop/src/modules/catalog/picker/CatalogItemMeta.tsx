import React from 'react';
import { Badge } from '@/components';
import { cn } from '@/lib';
import { getCatalogItemSublabel, type TCatalogItem } from './CatalogPickerCx';

export const CatalogItemSublabel: React.FC<TCatalogItemSublabelProps> = (props) => {
	const { item, className } = props;
	if (item.type !== 'website' || item.path?.includes('*') !== true) {
		return (
			<span className={cn('text-base-400 truncate text-xs', className)}>
				{getCatalogItemSublabel(item)}
			</span>
		);
	}

	return (
		<span className={cn('text-base-400 truncate text-xs', className)}>
			{item.hostname}
			<HighlightedWildcardPath path={item.path} />
		</span>
	);
};

interface TCatalogItemSublabelProps {
	item: TCatalogItem;
	className?: string;
}

const HighlightedWildcardPath: React.FC<THighlightedWildcardPathProps> = (props) => {
	const { path } = props;

	return (
		<>
			{path.split('*').map((part, index) => (
				<React.Fragment key={index}>
					{index > 0 && <span className="text-warning font-semibold">*</span>}
					{part}
				</React.Fragment>
			))}
		</>
	);
};

interface THighlightedWildcardPathProps {
	path: string;
}

export const CatalogItemBadges: React.FC<TCatalogItemBadgesProps> = (props) => {
	const { item } = props;

	return (
		<Badge variant={item.type === 'app' ? 'primary' : 'secondary'}>
			{item.type === 'app' ? 'app' : 'website'}
		</Badge>
	);
};

interface TCatalogItemBadgesProps {
	item: TCatalogItem;
}
