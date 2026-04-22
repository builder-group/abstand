import React from 'react';
import { PlusIcon, SettingsIcon, WindowHeaderRow } from '@/components';
import { cn } from '@/lib';
import { SidebarItem } from './SidebarItem';

export const MainSidebarContent: React.FC<TMainSidebarContentProps> = (props) => {
	const { className } = props;

	return (
		<div className={cn('flex h-full flex-col', className)}>
			<WindowHeaderRow />

			{/* Top actions */}
			<div className="border-base-100/80 flex flex-col gap-0.5 border-b px-2 py-2">
				<SidebarItem icon={<PlusIcon />} label="New Intention" to="/window/main/intentions/new" />
			</div>

			{/* TODO */}
			<div className="flex-1" />

			{/* Footer */}
			<div className="border-base-100/80 flex flex-col gap-0.5 border-t px-2 py-2">
				<SidebarItem icon={<SettingsIcon />} label="Settings" to="/window/main/settings" />
			</div>
		</div>
	);
};

interface TMainSidebarContentProps {
	className?: string;
}
