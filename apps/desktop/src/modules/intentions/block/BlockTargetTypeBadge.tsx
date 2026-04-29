import React from 'react';
import { Badge } from '@/components';
import type { TBlockTarget } from './block-target';

export const BlockTargetTypeBadge: React.FC<TBlockTargetTypeBadgeProps> = ({ target }) => (
	<Badge
		size="sm"
		className={
			target.type === 'app' ? 'bg-blue-500/10 text-blue-600' : 'bg-violet-500/10 text-violet-600'
		}
	>
		{target.type === 'app' ? 'app' : 'website'}
	</Badge>
);

interface TBlockTargetTypeBadgeProps {
	target: TBlockTarget;
}
