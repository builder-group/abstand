import React from 'react';
import { CodeXmlIcon, MonitorIcon } from '@/components';
import type { TCatalogItem } from './CatalogPickerCx';

export const CatalogItemIcon: React.FC<TCatalogItemIconProps> = (props) => {
	const { item, icon = item.type === 'app' ? item.app.icon : item.website.icon } = props;

	if (icon != null) {
		return (
			<span className="bg-base-0 flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg ring-1 ring-black/5">
				<img src={icon} alt="" className="size-6 object-contain" />
			</span>
		);
	}

	switch (item.type) {
		case 'app':
			return (
				<span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
					<MonitorIcon className="size-4" />
				</span>
			);
		case 'website':
			return (
				<span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
					<CodeXmlIcon className="size-4" />
				</span>
			);
	}
};

interface TCatalogItemIconProps {
	item: TCatalogItem;
	icon?: string | null;
}
