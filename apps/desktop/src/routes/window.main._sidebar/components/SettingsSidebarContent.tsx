import React from 'react';
import { ArrowLeftIcon, WindowHeaderRow } from '@/components';
import { cn } from '@/lib';
import { SidebarItem } from './SidebarItem';

export const SettingsSidebarContent: React.FC<TSettingsSidebarContentProps> = (props) => {
	const { className } = props;

	return (
		<div className={cn('flex h-full flex-col', className)}>
			<WindowHeaderRow />

			{/* Top actions */}
			<div className="border-base-100/80 flex flex-col gap-0.5 border-b px-2 py-2">
				<SidebarItem
					icon={<ArrowLeftIcon className="text-base-500 size-4 shrink-0" />}
					label="Back to app"
					to="/window/main/home"
				/>
			</div>

			{/* TODO */}
			<div className="flex-1" />
		</div>
	);
};

interface TSettingsSidebarContentProps {
	className?: string;
}
