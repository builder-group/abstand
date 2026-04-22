import React from 'react';
import { ArrowLeftIcon, IconBubble, SettingsIcon, WindowHeaderRow } from '@/components';
import { cn } from '@/lib';
import { SidebarItem } from './SidebarItem';

export const SettingsSidebarContent: React.FC<TSettingsSidebarContentProps> = (props) => {
	const { className } = props;

	return (
		<div className={cn('flex h-full flex-col', className)}>
			<WindowHeaderRow />

			{/* Top actions */}
			<div className="border-base-100/80 flex flex-col gap-0.5 border-b px-2 py-2">
				<SidebarItem icon={<ArrowLeftIcon />} label="Back to app" to="/window/main/home" />
			</div>

			{/* Settings nav */}
			<div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-2">
				<SidebarItem
					icon={
						<IconBubble variant="neutral" size="xs">
							<SettingsIcon />
						</IconBubble>
					}
					label="General"
					to="/window/main/settings/general"
				/>
			</div>
		</div>
	);
};

interface TSettingsSidebarContentProps {
	className?: string;
}
