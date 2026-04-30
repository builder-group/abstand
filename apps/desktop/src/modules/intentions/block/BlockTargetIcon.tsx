import React from 'react';
import { CodeXmlIcon, MonitorIcon } from '@/components';
import type { TBlockTarget } from './block-target';

export const BlockTargetIcon: React.FC<TBlockTargetIconProps> = (props) => {
	const { target, icon: iconOverride } = props;
	const icon = iconOverride ?? (target.type === 'app' ? target.app.icon : target.website.icon);

	if (icon != null) {
		return (
			<span className="bg-base-0 flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg ring-1 ring-black/5">
				<img src={icon} alt="" className="size-6 object-contain" />
			</span>
		);
	}

	switch (target.type) {
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

interface TBlockTargetIconProps {
	target: TBlockTarget;
	icon?: string | null;
}
