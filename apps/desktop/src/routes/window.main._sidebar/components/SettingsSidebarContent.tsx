import { Link } from '@tanstack/react-router';
import { useCompute } from 'feature-react/state';
import React from 'react';
import {
	ArrowLeftIcon,
	CodeXmlIcon,
	CommandIcon,
	IconBubble,
	SettingsIcon,
	WindowHeaderRow
} from '@/components';
import { cn } from '@/lib';
import { useSettingsCx } from '@/modules/settings';
import { SidebarItem } from './SidebarItem';

export const SettingsSidebarContent: React.FC<TSettingsSidebarContentProps> = (props) => {
	const { className } = props;
	const settingsCx = useSettingsCx();
	const developerEnabled = useCompute(settingsCx.$appSettings, (value) => value.developer.enabled);

	return (
		<div className={cn('flex h-full flex-col', className)}>
			<WindowHeaderRow />

			{/* Top nav */}
			<div className="border-base-100/80 flex flex-col gap-0.5 border-b px-2 py-2">
				<SidebarItem
					icon={<ArrowLeftIcon />}
					label="Back to app"
					render={<Link to="/window/main/today" />}
					isAction
				/>
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
					render={<Link to="/window/main/settings/general" />}
					className="py-0.75"
				/>
				<SidebarItem
					icon={
						<IconBubble variant="warning" size="xs">
							<CommandIcon />
						</IconBubble>
					}
					label="Shortcuts"
					render={<Link to="/window/main/settings/shortcuts" />}
					className="py-0.75"
				/>
				{developerEnabled && (
					<SidebarItem
						icon={
							<IconBubble variant="secondary" size="xs">
								<CodeXmlIcon />
							</IconBubble>
						}
						label="Developer"
						render={<Link to="/window/main/settings/developer" />}
						className="py-0.75"
					/>
				)}
			</div>
		</div>
	);
};

interface TSettingsSidebarContentProps {
	className?: string;
}
