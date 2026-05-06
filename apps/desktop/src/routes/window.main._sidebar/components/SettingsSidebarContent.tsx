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
	const developerEnabled = useCompute(
		settingsCx.$appSettings,
		({ value }) => value.developer.enabled
	);

	return (
		<div className={cn('flex h-full flex-col', className)}>
			<WindowHeaderRow />

			{/* Top nav */}
			<div className="border-base-100/80 flex flex-col gap-0.5 border-b px-2 py-2">
				<SidebarItem
					icon={<ArrowLeftIcon />}
					label="Back to app"
					to="/window/main/today"
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
					to="/window/main/settings/general"
					className="py-1"
				/>
				<SidebarItem
					icon={
						<IconBubble variant="warning" size="xs">
							<CommandIcon />
						</IconBubble>
					}
					label="Shortcuts"
					to="/window/main/settings/shortcuts"
					className="py-1"
				/>
				{developerEnabled && (
					<SidebarItem
						icon={
							<IconBubble variant="secondary" size="xs">
								<CodeXmlIcon />
							</IconBubble>
						}
						label="Developer"
						to="/window/main/settings/developer"
						className="py-1"
					/>
				)}
			</div>
		</div>
	);
};

interface TSettingsSidebarContentProps {
	className?: string;
}
